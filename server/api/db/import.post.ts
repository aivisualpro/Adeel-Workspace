import { getMongoClient } from '../../utils/mongodb'

interface ImportProgress {
    status: 'idle' | 'parsing' | 'importing' | 'done' | 'error'
    total: number
    imported: number
    batchesDone: number
    totalBatches: number
    message: string
    fields: string[]
    startTime: number
    elapsed: number
}

// In-memory progress store (keyed by a session id)
const progressMap = new Map<string, ImportProgress>()

export function getProgress(sessionId: string): ImportProgress | undefined {
    return progressMap.get(sessionId)
}

function parseCSV(raw: string): { headers: string[], rows: Record<string, string>[] } {
    const lines = raw.split(/\r?\n/)
    if (lines.length === 0) return { headers: [], rows: [] }

    // Parse CSV header — handle quoted fields
    const parseRow = (line: string): string[] => {
        const result: string[] = []
        let current = ''
        let inQuotes = false

        for (let i = 0; i < line.length; i++) {
            const char = line[i]
            if (char === '"') {
                if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
                    current += '"'
                    i++
                }
                else {
                    inQuotes = !inQuotes
                }
            }
            else if (char === ',' && !inQuotes) {
                result.push(current.trim())
                current = ''
            }
            else {
                current += char
            }
        }
        result.push(current.trim())
        return result
    }

    const headers = parseRow(lines[0]).map(h => h.replace(/^["']|["']$/g, '').trim())
    const rows: Record<string, string>[] = []

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue

        const values = parseRow(line)
        const row: Record<string, string> = {}
        for (let j = 0; j < headers.length; j++) {
            const val = (values[j] || '').replace(/^["']|["']$/g, '').trim()
            row[headers[j]] = val
        }
        rows.push(row)
    }

    return { headers, rows }
}

export default defineEventHandler(async (event) => {
    const formData = await readMultipartFormData(event)
    if (!formData) {
        throw createError({ statusCode: 400, message: 'No form data received' })
    }

    let database = ''
    let collection = ''
    let csvContent = ''
    let sessionId = ''
    let batchSize = 500

    for (const field of formData) {
        if (field.name === 'database') database = field.data.toString('utf-8')
        if (field.name === 'collection') collection = field.data.toString('utf-8')
        if (field.name === 'sessionId') sessionId = field.data.toString('utf-8')
        if (field.name === 'batchSize') batchSize = parseInt(field.data.toString('utf-8')) || 500
        if (field.name === 'file' && field.filename) {
            csvContent = field.data.toString('utf-8')
        }
    }

    if (!database || !collection || !csvContent || !sessionId) {
        throw createError({ statusCode: 400, message: 'database, collection, sessionId, and file are required' })
    }

    // Initialize progress
    const progress: ImportProgress = {
        status: 'parsing',
        total: 0,
        imported: 0,
        batchesDone: 0,
        totalBatches: 0,
        message: 'Parsing CSV...',
        fields: [],
        startTime: Date.now(),
        elapsed: 0,
    }
    progressMap.set(sessionId, progress)

    // Parse CSV
    const { headers, rows } = parseCSV(csvContent)
    progress.fields = headers
    progress.total = rows.length
    progress.totalBatches = Math.ceil(rows.length / batchSize)
    progress.message = `Parsed ${rows.length.toLocaleString()} records with ${headers.length} fields`

    if (rows.length === 0) {
        progress.status = 'done'
        progress.message = 'CSV is empty — nothing to import'
        return { success: true, sessionId }
    }

    // Start async import (don't await — let progress polling handle UI updates)
    importInBackground(database, collection, rows, batchSize, sessionId, progress)

    return { success: true, sessionId, total: rows.length, fields: headers }
})

async function importInBackground(
    database: string,
    collection: string,
    rows: Record<string, string>[],
    batchSize: number,
    sessionId: string,
    progress: ImportProgress,
) {
    try {
        const client = await getMongoClient()
        const db = client.db(database)
        const col = db.collection(collection)

        progress.status = 'importing'
        progress.message = 'Importing records...'

        // Process in batches
        for (let i = 0; i < rows.length; i += batchSize) {
            const batch = rows.slice(i, i + batchSize)

            // Convert fields: attempt numeric/boolean/date coercion, keep empty strings as-is (no required fields)
            const documents = batch.map((row) => {
                const doc: Record<string, any> = {}
                for (const [key, val] of Object.entries(row)) {
                    if (val === '') {
                        doc[key] = null // empty → null, NOT required
                    }
                    else if (val.toLowerCase() === 'true') {
                        doc[key] = true
                    }
                    else if (val.toLowerCase() === 'false') {
                        doc[key] = false
                    }
                    else if (!isNaN(Number(val)) && val.trim() !== '') {
                        doc[key] = Number(val)
                    }
                    else {
                        doc[key] = val
                    }
                }
                return doc
            })

            await col.insertMany(documents, { ordered: false })

            progress.imported += batch.length
            progress.batchesDone += 1
            progress.elapsed = Date.now() - progress.startTime
            progress.message = `Imported ${progress.imported.toLocaleString()} of ${progress.total.toLocaleString()} records (batch ${progress.batchesDone}/${progress.totalBatches})`
        }

        progress.status = 'done'
        progress.elapsed = Date.now() - progress.startTime
        progress.message = `✅ Successfully imported ${progress.total.toLocaleString()} records in ${(progress.elapsed / 1000).toFixed(1)}s`
    }
    catch (err: any) {
        progress.status = 'error'
        progress.elapsed = Date.now() - progress.startTime
        progress.message = `❌ Import failed: ${err.message}`
    }

    // Clean up progress after 5 minutes
    setTimeout(() => progressMap.delete(sessionId), 5 * 60 * 1000)
}
