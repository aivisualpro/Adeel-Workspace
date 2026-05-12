import { getMongoClient } from '../../utils/mongodb'

interface EmbedProgress {
    status: 'idle' | 'parsing' | 'processing' | 'done' | 'error'
    total: number
    matched: number
    unmatched: number
    documentsUpdated: number
    processed: number
    percentage: number
    message: string
    startTime: number
    elapsed: number
    speed: number
    eta: number
    remainingRecords: number
    csvFields: string[]
    unmatchedSamples: string[]
}

// In-memory progress store
const embedProgressMap = new Map<string, EmbedProgress>()

export function getEmbedProgress(sessionId: string): EmbedProgress | undefined {
    return embedProgressMap.get(sessionId)
}

function parseCSV(raw: string): { headers: string[], rows: Record<string, string>[] } {
    if (!raw.trim()) return { headers: [], rows: [] }

    const logicalRows: string[] = []
    let currentRow = ''
    let inQuotes = false

    for (let i = 0; i < raw.length; i++) {
        const ch = raw[i]!
        if (ch === '"') {
            if (inQuotes && i + 1 < raw.length && raw[i + 1] === '"') {
                currentRow += '""'
                i++
            } else {
                inQuotes = !inQuotes
                currentRow += ch
            }
        } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
            if (ch === '\r' && i + 1 < raw.length && raw[i + 1] === '\n') i++
            if (currentRow.trim()) logicalRows.push(currentRow)
            currentRow = ''
        } else {
            currentRow += ch
        }
    }
    if (currentRow.trim()) logicalRows.push(currentRow)

    if (logicalRows.length === 0) return { headers: [], rows: [] }

    const parseRow = (line: string): string[] => {
        const result: string[] = []
        let current = ''
        let quoted = false
        let braceDepth = 0  // track {} nesting so commas inside objects aren't treated as separators
        for (let i = 0; i < line.length; i++) {
            const char = line[i]
            if (char === '"') {
                if (quoted && i + 1 < line.length && line[i + 1] === '"') {
                    current += '"'
                    i++
                } else {
                    quoted = !quoted
                }
            } else if (char === '{' && !quoted) {
                braceDepth++
                current += char
            } else if (char === '}' && !quoted) {
                braceDepth--
                current += char
            } else if (char === ',' && !quoted && braceDepth === 0) {
                result.push(current.trim())
                current = ''
            } else {
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

    return { headers, rows }
}

function coerceValue(val: string): any {
    if (val === '') return null
    if (val === 'Y' || val === 'y' || val.toLowerCase() === 'true') return true
    if (val === 'N' || val === 'n' || val.toLowerCase() === 'false') return false
    // Currency / formatted numbers
    if (/^[£€$¥₹]?\s*-?\d{1,3}(,\d{3})*(\.\d+)?$/.test(val.trim()) || /^-?[£€$¥₹]\s*\d{1,3}(,\d{3})*(\.\d+)?$/.test(val.trim())) {
        const cleaned = val.replace(/[^0-9.\-]/g, '')
        return cleaned !== '' ? Number(cleaned) : val
    }
    if (!isNaN(Number(val)) && val.trim() !== '') return Number(val)
    return val
}

/**
 * Parse a cell that contains one or more {key: value , key: value} blocks.
 * Returns an array of parsed objects, or null if the format doesn't match.
 *
 * Handles:
 *   {name: Declined to Bid , color: #71717a , icon: i-lucide-alert-triangle , variant: filled , sortOrder: 1 , isDefault: FALSE}
 *   , {name: Bid Submitted , color: #f59e0b , ...}
 */
function parseObjectArrayCell(val: string): Record<string, any>[] | null {
    const trimmed = val.trim()
    // Must start with { to be an object-array cell
    if (!trimmed.startsWith('{')) return null

    const KNOWN_KEYS = ['name', 'color', 'icon', 'variant', 'sortOrder', 'isDefault']
    const KEY_PATTERN = new RegExp(`(${KNOWN_KEYS.join('|')})\\s*:`, 'g')

    // Strip outer braces, then split on '} , {' to get individual object strings
    const inner = trimmed.replace(/^\{/, '').replace(/\}$/, '')
    const objectStrings = (`{${inner}}`)
        .split(/\}\s*,\s*\{/)
        .map(s => s.replace(/^\{/, '').replace(/\}$/, '').trim())
        .filter(Boolean)

    if (objectStrings.length === 0) return null

    const results: Record<string, any>[] = []

    for (const objStr of objectStrings) {
        // Find all key positions
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
            const value = objStr.slice(end, nextStart).trim().replace(/\s*,\s*$/, '').trim()
            result[key] = value
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

function coerceFieldValue(val: string): any {
    const trimmed = val.trim()
    if (trimmed === '') return null

    // ── Object-array format: {name: X , color: Y , ...} , {name: Z , ...} ──
    const parsed = parseObjectArrayCell(trimmed)
    if (parsed !== null) return parsed

    // ── Standard comma-separated list ────────────────────────────────────────
    // Only split on " , " patterns — avoids splitting phone area-codes like (770,123)
    // We require at least one space on either side of the comma.
    const parts = trimmed.split(/\s*,\s*/).map(p => p.trim()).filter(p => p !== '')

    if (parts.length > 1) {
        // Return as an indexed object: { "0": v0, "1": v1, … }
        const obj: Record<string, any> = {}
        parts.forEach((part, idx) => {
            obj[String(idx)] = coerceValue(part)
        })
        return obj
    }

    // Single value — use the standard coercion path
    return coerceValue(trimmed)
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
    let source = 'adeel'
    let arrayFieldName = ''
    let csvMatchField = ''       // field in CSV to match on
    let collectionMatchField = '' // field in collection to match against
    let batchSize = 500
    // CSV fields to exclude from the embedded object (e.g. the matching field itself)
    let excludeFieldsJson = '[]'

    for (const field of formData) {
        if (field.name === 'database') database = field.data.toString('utf-8')
        if (field.name === 'collection') collection = field.data.toString('utf-8')
        if (field.name === 'sessionId') sessionId = field.data.toString('utf-8')
        if (field.name === 'source') source = field.data.toString('utf-8')
        if (field.name === 'arrayFieldName') arrayFieldName = field.data.toString('utf-8')
        if (field.name === 'csvMatchField') csvMatchField = field.data.toString('utf-8')
        if (field.name === 'collectionMatchField') collectionMatchField = field.data.toString('utf-8')
        if (field.name === 'batchSize') batchSize = parseInt(field.data.toString('utf-8')) || 500
        if (field.name === 'excludeFields') excludeFieldsJson = field.data.toString('utf-8')
        if (field.name === 'file' && field.filename) {
            csvContent = field.data.toString('utf-8')
        }
    }

    if (!database || !collection || !csvContent || !sessionId || !arrayFieldName || !csvMatchField || !collectionMatchField) {
        throw createError({
            statusCode: 400,
            message: 'database, collection, sessionId, arrayFieldName, csvMatchField, collectionMatchField, and file are required',
        })
    }

    let excludeFields: string[] = []
    try { excludeFields = JSON.parse(excludeFieldsJson) } catch { excludeFields = [] }

    console.log(`[EmbedArray] Source: "${source}", DB: "${database}", Collection: "${collection}"`)
    console.log(`[EmbedArray] Array field: "${arrayFieldName}", CSV match: "${csvMatchField}" → Collection match: "${collectionMatchField}"`)
    console.log(`[EmbedArray] Exclude fields: ${JSON.stringify(excludeFields)}`)

    // Initialize progress
    const progress: EmbedProgress = {
        status: 'parsing',
        total: 0,
        matched: 0,
        unmatched: 0,
        documentsUpdated: 0,
        processed: 0,
        percentage: 0,
        message: 'Parsing CSV...',
        startTime: Date.now(),
        elapsed: 0,
        speed: 0,
        eta: 0,
        remainingRecords: 0,
        csvFields: [],
        unmatchedSamples: [],
    }
    embedProgressMap.set(sessionId, progress)

    // Parse CSV
    const { headers, rows } = parseCSV(csvContent)
    progress.csvFields = headers
    progress.total = rows.length
    progress.message = `Parsed ${rows.length.toLocaleString()} CSV records with ${headers.length} fields`

    if (rows.length === 0) {
        progress.status = 'done'
        progress.message = 'CSV is empty — nothing to embed'
        return { success: true, sessionId }
    }

    // Start async processing
    embedInBackground(database, collection, rows, headers, sessionId, progress, {
        arrayFieldName,
        csvMatchField,
        collectionMatchField,
        excludeFields,
        batchSize,
        source,
    })

    return { success: true, sessionId, total: rows.length, fields: headers }
})

interface EmbedConfig {
    arrayFieldName: string
    csvMatchField: string
    collectionMatchField: string
    excludeFields: string[]
    batchSize: number
    source: string
}

async function embedInBackground(
    database: string,
    collectionName: string,
    rows: Record<string, string>[],
    headers: string[],
    sessionId: string,
    progress: EmbedProgress,
    config: EmbedConfig,
) {
    try {
        const client = await getMongoClient(config.source)
        const db = client.db(database)
        const col = db.collection(collectionName)

        progress.status = 'processing'
        progress.message = 'Building match index from CSV...'

        // ── Group CSV rows by match field value ─────────────────────────────
        // matchValue → array of CSV row objects (coerced)
        const csvGrouped = new Map<string, Record<string, any>[]>()
        const fieldsToInclude = headers.filter(h => h !== config.csvMatchField && !config.excludeFields.includes(h))

        for (const row of rows) {
            const matchVal = (row[config.csvMatchField] ?? '').trim().toLowerCase()
            if (!matchVal) continue

            // Build the embedded object (coerce values, expand comma-separated fields, exclude match field)
            const obj: Record<string, any> = {}
            for (const field of fieldsToInclude) {
                obj[field] = coerceFieldValue(row[field] ?? '')
            }

            if (!csvGrouped.has(matchVal)) {
                csvGrouped.set(matchVal, [])
            }
            csvGrouped.get(matchVal)!.push(obj)
        }

        console.log(`[EmbedArray] Grouped CSV into ${csvGrouped.size} unique match keys`)
        const sampleKeys = Array.from(csvGrouped.keys()).slice(0, 5)
        console.log(`[EmbedArray] Sample match keys:`, sampleKeys)

        progress.message = `Found ${csvGrouped.size} unique match values. Fetching collection documents...`

        // ── Fetch all existing documents with the match field ─────────────
        const existingDocs = await col.find(
            { [config.collectionMatchField]: { $exists: true, $ne: null } },
            { projection: { _id: 1, [config.collectionMatchField]: 1 } },
        ).toArray()

        console.log(`[EmbedArray] Fetched ${existingDocs.length} documents from collection with field "${config.collectionMatchField}"`)

        // Build lookup: matchValue → document _id(s)
        const docLookup = new Map<string, any[]>()
        for (const doc of existingDocs) {
            const rawVal = doc[config.collectionMatchField]
            const key = String(rawVal ?? '').trim().toLowerCase()
            if (!key) continue
            if (!docLookup.has(key)) docLookup.set(key, [])
            docLookup.get(key)!.push(doc._id)
        }

        console.log(`[EmbedArray] Built document lookup with ${docLookup.size} unique keys`)

        // ── Process matches and update documents ─────────────────────────
        progress.message = 'Embedding arrays into documents...'

        const matchKeys = Array.from(csvGrouped.keys())
        let matched = 0
        let unmatched = 0
        let documentsUpdated = 0
        const unmatchedSamples: string[] = []

        for (let i = 0; i < matchKeys.length; i += config.batchSize) {
            const batchKeys = matchKeys.slice(i, i + config.batchSize)

            for (const key of batchKeys) {
                const csvObjects = csvGrouped.get(key)!
                const docIds = docLookup.get(key)

                if (docIds && docIds.length > 0) {
                    // Push all CSV objects into the array field for each matching document
                    const result = await col.updateMany(
                        { _id: { $in: docIds } },
                        { $push: { [config.arrayFieldName]: { $each: csvObjects } } as any },
                    )
                    matched += csvObjects.length
                    documentsUpdated += result.modifiedCount
                } else {
                    unmatched += csvObjects.length
                    if (unmatchedSamples.length < 10) {
                        unmatchedSamples.push(key)
                    }
                }

                progress.processed++
            }

            // Update progress
            progress.matched = matched
            progress.unmatched = unmatched
            progress.documentsUpdated = documentsUpdated
            progress.unmatchedSamples = unmatchedSamples
            progress.elapsed = Date.now() - progress.startTime
            progress.percentage = Math.round((progress.processed / matchKeys.length) * 100)
            progress.remainingRecords = matchKeys.length - progress.processed
            progress.speed = progress.elapsed > 0 ? Math.round((progress.processed / progress.elapsed) * 1000) : 0
            progress.eta = progress.speed > 0 ? Math.round(progress.remainingRecords / progress.speed) : 0
            progress.message = `Processing ${progress.processed} of ${matchKeys.length} unique keys (${matched} rows matched, ${unmatched} unmatched)`
        }

        progress.status = 'done'
        progress.percentage = 100
        progress.matched = matched
        progress.unmatched = unmatched
        progress.documentsUpdated = documentsUpdated
        progress.unmatchedSamples = unmatchedSamples
        progress.elapsed = Date.now() - progress.startTime
        progress.remainingRecords = 0
        progress.message = `✅ Embedded ${matched.toLocaleString()} records into ${documentsUpdated.toLocaleString()} documents. ${unmatched} unmatched rows.`

        console.log(`[EmbedArray:DONE] Matched: ${matched}, Unmatched: ${unmatched}, Documents updated: ${documentsUpdated}`)
        if (unmatchedSamples.length > 0) {
            console.log(`[EmbedArray] Unmatched sample keys:`, unmatchedSamples)
        }
    } catch (err: any) {
        progress.status = 'error'
        progress.elapsed = Date.now() - progress.startTime
        progress.message = `❌ Embed failed: ${err.message}`
        console.error(`[EmbedArray:ERROR]`, err)
    }

    // Clean up progress after 5 minutes
    setTimeout(() => embedProgressMap.delete(sessionId), 5 * 60 * 1000)
}
