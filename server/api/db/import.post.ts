import { getMongoClient } from '../../utils/mongodb'
import { ObjectId } from 'mongodb'

interface Reference {
    localField: string       // field in the CSV being imported
    collection: string       // reference collection name (e.g. hardwoodDatabase_Categories)
    refField: string         // field in ref collection to match against
    storeField: string       // field name to store the ObjectId as (e.g. category_id)
}

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
    speed: number
    remainingRecords: number
    percentage: number
    eta: number
}

// In-memory progress store (keyed by a session id)
const progressMap = new Map<string, ImportProgress>()

export function getProgress(sessionId: string): ImportProgress | undefined {
    return progressMap.get(sessionId)
}

function parseCSV(raw: string): { headers: string[], rows: Record<string, string>[] } {
    const lines = raw.split(/\r?\n/)
    if (lines.length === 0) return { headers: [], rows: [] }

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

    const headers = parseRow(lines[0]!).map(h => h.replace(/^["']|["']$/g, '').trim())
    const rows: Record<string, string>[] = []

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i]!.trim()
        if (!line) continue

        const values = parseRow(line)
        const row: Record<string, string> = {}
        for (let j = 0; j < headers.length; j++) {
            const val = (values[j] || '').replace(/^["']|["']$/g, '').trim()
            row[headers[j]!] = val
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
    let referencesJson = '[]'
    let source = 'adeel'

    for (const field of formData) {
        if (field.name === 'database') database = field.data.toString('utf-8')
        if (field.name === 'collection') collection = field.data.toString('utf-8')
        if (field.name === 'sessionId') sessionId = field.data.toString('utf-8')
        if (field.name === 'batchSize') batchSize = parseInt(field.data.toString('utf-8')) || 500
        if (field.name === 'references') referencesJson = field.data.toString('utf-8')
        if (field.name === 'source') source = field.data.toString('utf-8')
        if (field.name === 'file' && field.filename) {
            csvContent = field.data.toString('utf-8')
        }
    }

    if (!database || !collection || !csvContent || !sessionId) {
        throw createError({ statusCode: 400, message: 'database, collection, sessionId, and file are required' })
    }

    let references: Reference[] = []
    try {
        references = JSON.parse(referencesJson) as Reference[]
    }
    catch {
        references = []
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
        speed: 0,
        remainingRecords: 0,
        percentage: 0,
        eta: 0,
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

    // Start async import
    importInBackground(database, collection, rows, batchSize, sessionId, progress, references, source)

    return { success: true, sessionId, total: rows.length, fields: headers }
})

async function importInBackground(
    database: string,
    collection: string,
    rows: Record<string, string>[],
    batchSize: number,
    sessionId: string,
    progress: ImportProgress,
    references: Reference[],
    source: string,
) {
    try {
        const client = await getMongoClient(source)
        const db = client.db(database)
        const col = db.collection(collection)

        // ── Build reference lookup maps ──────────────────────────────────────
        // Map: refDef → Map<refFieldValue → ObjectId>
        type RefMap = Map<string, ObjectId>
        const refMaps = new Map<string, RefMap>()

        if (references.length > 0) {
            progress.message = 'Building reference lookup maps...'

            for (const ref of references) {
                const refCol = db.collection(ref.collection)
                // Fetch all docs from reference collection (field + _id only)
                const refDocs = await refCol.find(
                    {},
                    { projection: { _id: 1, [ref.refField]: 1 } },
                ).toArray()

                const lookupMap: RefMap = new Map()
                for (const doc of refDocs) {
                    const key = String(doc[ref.refField] ?? '')
                    if (key) lookupMap.set(key.toLowerCase(), doc._id as ObjectId)
                }

                refMaps.set(ref.localField, lookupMap)
            }
        }

        progress.status = 'importing'
        progress.message = 'Importing records...'

        // ── Process in batches ───────────────────────────────────────────────
        for (let i = 0; i < rows.length; i += batchSize) {
            const batch = rows.slice(i, i + batchSize)

            const documents = batch.map((row) => {
                const doc: Record<string, any> = {}

                for (const [key, val] of Object.entries(row)) {
                    // Check if this field has a reference
                    const ref = references.find(r => r.localField === key)

                    if (ref) {
                        // Resolve to ObjectId
                        const lookupMap = refMaps.get(key)
                        const objectId = lookupMap?.get(val.toLowerCase()) ?? null
                        // Store original value field (remove it; replaced by ref field)
                        doc[ref.storeField] = objectId
                        // Optionally keep the raw text value for debugging
                        // doc[`${ref.storeField}_raw`] = val
                    }
                    else {
                        // Normal field coercion
                        if (val === '') {
                            doc[key] = null
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
                }

                return doc
            })

            await col.insertMany(documents, { ordered: false })

            progress.imported += batch.length
            progress.batchesDone += 1
            progress.elapsed = Date.now() - progress.startTime
            progress.percentage = Math.round((progress.imported / progress.total) * 100)
            progress.remainingRecords = progress.total - progress.imported
            progress.speed = progress.elapsed > 0 ? Math.round((progress.imported / progress.elapsed) * 1000) : 0
            progress.eta = progress.speed > 0 ? Math.round(progress.remainingRecords / progress.speed) : 0
            progress.message = `Imported ${progress.imported.toLocaleString()} of ${progress.total.toLocaleString()} records (batch ${progress.batchesDone}/${progress.totalBatches})`
        }

        progress.status = 'done'
        progress.percentage = 100
        progress.elapsed = Date.now() - progress.startTime
        progress.remainingRecords = 0
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
