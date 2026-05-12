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

/**
 * Parse a cell containing one or more {key: value , ...} blocks.
 * Handles: {name: X , color: Y , icon: Z , variant: V , sortOrder: N , isDefault: B} , {name: ...}
 * Returns an array of objects, or null if the cell doesn't match this format.
 */
function parseObjectArrayCell(val: string): Record<string, any>[] | null {
    const trimmed = val.trim()
    if (!trimmed.startsWith('{')) return null

    const KNOWN_KEYS = ['name', 'color', 'icon', 'variant', 'sortOrder', 'isDefault']
    const KEY_PATTERN = new RegExp(`(${KNOWN_KEYS.join('|')})\\s*:`, 'g')

    const inner = trimmed.replace(/^\{/, '').replace(/\}$/, '')
    const objectStrings = (`{${inner}}`)
        .split(/\}\s*,\s*\{/)
        .map(s => s.replace(/^\{/, '').replace(/\}$/, '').trim())
        .filter(Boolean)

    if (objectStrings.length === 0) return null

    const results: Record<string, any>[] = []

    for (const objStr of objectStrings) {
        const positions: Array<{ key: string; start: number; end: number }> = []
        let match
        KEY_PATTERN.lastIndex = 0
        while ((match = KEY_PATTERN.exec(objStr)) !== null) {
            positions.push({ key: match[1] ?? '', start: match.index, end: match.index + match[0].length })
        }
        if (positions.length === 0) continue

        const result: Record<string, string> = {}
        for (let i = 0; i < positions.length; i++) {
            const { key, end } = positions[i]!
            const nextPos = positions[i + 1]
            const nextStart = nextPos !== undefined ? nextPos.start : objStr.length
            result[key] = objStr.slice(end, nextStart).trim().replace(/\s*,\s*$/, '').trim()
        }
        if (!result.name?.trim()) continue

        results.push({
            name: result.name.trim(),
            color: result.color?.trim() ?? '',
            icon: result.icon?.trim() ?? '',
            variant: result.variant?.trim() ?? 'semi-filled',
            sortOrder: Number(result.sortOrder) || 0,
            isDefault: result.isDefault?.trim().toUpperCase() === 'TRUE',
        })
    }

    return results.length > 0 ? results : null
}

function parseCSV(raw: string): { headers: string[], rows: Record<string, string>[] } {
    if (!raw.trim()) return { headers: [], rows: [] }

    // ── Split into logical rows (handles multi-line quoted fields) ────────
    const logicalRows: string[] = []
    let currentRow = ''
    let inQuotes = false

    for (let i = 0; i < raw.length; i++) {
        const ch = raw[i]!

        if (ch === '"') {
            if (inQuotes && i + 1 < raw.length && raw[i + 1] === '"') {
                // Escaped quote "" → append both and skip next
                currentRow += '""'
                i++
            }
            else {
                inQuotes = !inQuotes
                currentRow += ch
            }
        }
        else if ((ch === '\n' || ch === '\r') && !inQuotes) {
            // End of logical row
            if (ch === '\r' && i + 1 < raw.length && raw[i + 1] === '\n') i++
            if (currentRow.trim()) logicalRows.push(currentRow)
            currentRow = ''
        }
        else {
            currentRow += ch
        }
    }
    if (currentRow.trim()) logicalRows.push(currentRow)

    if (logicalRows.length === 0) return { headers: [], rows: [] }

    // ── Parse a single CSV row into field values ─────────────────────────
    const parseRow = (line: string): string[] => {
        const result: string[] = []
        let current = ''
        let quoted = false
        let braceDepth = 0 // protect commas inside {key: value , ...} blocks

        for (let i = 0; i < line.length; i++) {
            const char = line[i]
            if (char === '"') {
                if (quoted && i + 1 < line.length && line[i + 1] === '"') {
                    current += '"'
                    i++
                }
                else {
                    quoted = !quoted
                }
            }
            else if (char === '{' && !quoted) {
                braceDepth++
                current += char
            }
            else if (char === '}' && !quoted) {
                braceDepth--
                current += char
            }
            else if (char === ',' && !quoted && braceDepth === 0) {
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

    const headers = parseRow(logicalRows[0]!).map(h => h.replace(/^["']|["']$/g, '').trim())
    const rows: Record<string, string>[] = []

    for (let i = 1; i < logicalRows.length; i++) {
        const values = parseRow(logicalRows[i]!)
        const row: Record<string, string> = {}
        for (let j = 0; j < headers.length; j++) {
            const val = (values[j] || '').replace(/^["']|["']$/g, '').trim()
            row[headers[j]!] = val
        }
        rows.push(row)
    }

    console.log(`[CSV Parser] ${logicalRows.length - 1} logical rows from ${raw.split(/\r?\n/).length} physical lines (${headers.length} columns)`)

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

    console.log(`[Import] Source: "${source}", DB: "${database}", Collection: "${collection}"`)
    console.log(`[Import] References received:`, JSON.stringify(references, null, 2))

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

    // Log reference field diagnostics
    if (references.length > 0 && rows.length > 0) {
        for (const ref of references) {
            const nonEmpty = rows.filter(r => (r[ref.localField] ?? '').trim() !== '')
            const firstNonEmpty = nonEmpty.length > 0 ? nonEmpty[0]![ref.localField] : '<ALL EMPTY>'
            console.log(`[Import] CSV field "${ref.localField}": ${nonEmpty.length} of ${rows.length} rows have values. First non-empty: "${firstNonEmpty}"`)
        }
    }

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

                console.log(`[RefLookup] Collection "${ref.collection}" → fetched ${refDocs.length} docs, matching field: "${ref.refField}"`)

                const lookupMap: RefMap = new Map()
                for (const doc of refDocs) {
                    const rawVal = doc[ref.refField]
                    // Normalize: handle numbers, ObjectIds, and strings
                    const key = String(rawVal ?? '').trim()
                    if (key) lookupMap.set(key.toLowerCase(), doc._id as ObjectId)
                }

                // Log sample keys for debugging
                const sampleKeys = Array.from(lookupMap.keys()).slice(0, 5)
                console.log(`[RefLookup] Built lookup map with ${lookupMap.size} keys. Sample keys:`, sampleKeys)

                refMaps.set(ref.localField, lookupMap)
            }
        }

        progress.status = 'importing'
        progress.message = 'Importing records...'

        // Track reference resolution stats
        const refStats: Record<string, { hit: number, miss: number, empty: number }> = {}
        for (const ref of references) {
            refStats[ref.localField] = { hit: 0, miss: 0, empty: 0 }
        }

        // ── Process in batches ───────────────────────────────────────────────
        for (let i = 0; i < rows.length; i += batchSize) {
            const batch = rows.slice(i, i + batchSize)

            const documents = batch.map((row) => {
                const doc: Record<string, any> = {}

                for (const [key, val] of Object.entries(row)) {
                    // Check if this field has a reference
                    const ref = references.find(r => r.localField === key)

                    if (ref) {
                        // Resolve to ObjectId — trim + lowercase to match the lookup map
                        const lookupMap = refMaps.get(key)
                        const lookupKey = val.trim().toLowerCase()
                        const objectId = lookupMap?.get(lookupKey) ?? null

                        // Track stats
                        if (refStats[key]) {
                            if (!lookupKey) refStats[key].empty++
                            else if (objectId) refStats[key].hit++
                            else refStats[key].miss++
                        }

                        // Debug: log first few non-empty misses to help diagnose
                        if (!objectId && lookupKey && refStats[key]?.miss <= 3) {
                            console.log(`[RefLookup:MISS] CSV field "${key}" value "${val}" (key: "${lookupKey}") not found in lookup map (${lookupMap?.size ?? 0} entries)`)
                        }

                        // Store resolved ObjectId (or null if unresolved)
                        doc[ref.storeField] = objectId
                    }
                    else {
                        // Normal field coercion
                        if (val === '') {
                            doc[key] = null
                        }
                        // Y / N → boolean
                        else if (val === 'Y' || val === 'y') {
                            doc[key] = true
                        }
                        else if (val === 'N' || val === 'n') {
                            doc[key] = false
                        }
                        else if (val.toLowerCase() === 'true') {
                            doc[key] = true
                        }
                        else if (val.toLowerCase() === 'false') {
                            doc[key] = false
                        }
                        // Currency / formatted numbers: $478,541.06  -$1,234.56  1,234,567  €50,000
                        // Must be checked BEFORE plain number and comma-list to avoid splitting on thousand separators
                        else if (/^[£€$¥₹]?\s*-?\d{1,3}(,\d{3})*(\.\d+)?$/.test(val.trim()) || /^-?[£€$¥₹]\s*\d{1,3}(,\d{3})*(\.\d+)?$/.test(val.trim())) {
                            const cleaned = val.replace(/[^0-9.\-]/g, '')
                            doc[key] = cleaned !== '' ? Number(cleaned) : val
                        }
                        else if (!isNaN(Number(val)) && val.trim() !== '') {
                            doc[key] = Number(val)
                        }
                        // {key: value , ...} , {key: value , ...} → array of objects
                        else if (val.trim().startsWith('{')) {
                            doc[key] = parseObjectArrayCell(val)
                        }
                        // Comma-separated list → array of coerced values
                        else if (val.includes(',')) {
                            const parts = val.split(',').map(p => p.trim()).filter(Boolean)
                            if (parts.length > 1) {
                                doc[key] = parts.map(p => {
                                    if (p === 'Y' || p === 'y') return true
                                    if (p === 'N' || p === 'n') return false
                                    if (p.toLowerCase() === 'true') return true
                                    if (p.toLowerCase() === 'false') return false
                                    if (!isNaN(Number(p)) && p !== '') return Number(p)
                                    return p
                                })
                            }
                            else {
                                doc[key] = parts[0] ?? val
                            }
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

        // Log reference resolution summary
        for (const [field, stats] of Object.entries(refStats)) {
            console.log(`[RefLookup:SUMMARY] Field "${field}": ${stats.hit} resolved, ${stats.miss} not found, ${stats.empty} empty`)
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
