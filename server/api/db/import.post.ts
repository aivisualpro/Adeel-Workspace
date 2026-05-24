import { getMongoClient } from '../../utils/mongodb'
import { parseCSV, buildRefLookupMaps, buildDocument, detectArrayRefFields } from '../../utils/csv-utils'
import type { Reference } from '../../utils/csv-utils'

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
    let splitAsArrayJson = '[]'
    let source = 'adeel'

    for (const field of formData) {
        if (field.name === 'database') database = field.data.toString('utf-8')
        if (field.name === 'collection') collection = field.data.toString('utf-8')
        if (field.name === 'sessionId') sessionId = field.data.toString('utf-8')
        if (field.name === 'batchSize') batchSize = parseInt(field.data.toString('utf-8')) || 500
        if (field.name === 'references') referencesJson = field.data.toString('utf-8')
        if (field.name === 'splitAsArray') splitAsArrayJson = field.data.toString('utf-8')
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

    let splitAsArrayFields: Set<string>
    try {
        const parsed = JSON.parse(splitAsArrayJson) as string[]
        splitAsArrayFields = new Set(parsed)
    }
    catch {
        splitAsArrayFields = new Set()
    }

    console.log(`[Import] Source: "${source}", DB: "${database}", Collection: "${collection}"`)
    console.log(`[Import] References received:`, JSON.stringify(references, null, 2))
    if (splitAsArrayFields.size > 0) {
        console.log(`[Import] Split-as-array fields:`, Array.from(splitAsArrayFields))
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
    importInBackground(database, collection, rows, batchSize, sessionId, progress, references, source, splitAsArrayFields)

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
    splitAsArrayFields: Set<string>,
) {
    try {
        const client = await getMongoClient(source)
        const db = client.db(database)
        const col = db.collection(collection)

        // ── Build reference lookup maps ──────────────────────────────────────
        let refMaps = new Map()
        let arrayRefFields = new Set<string>()
        if (references.length > 0) {
            progress.message = 'Building reference lookup maps...'
            refMaps = await buildRefLookupMaps(db, references, rows)
            // Pre-scan to detect which ref fields have any comma-separated values
            arrayRefFields = detectArrayRefFields(rows, references)
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

            const documents = batch.map((row) =>
                buildDocument(row, references, refMaps, refStats, splitAsArrayFields, arrayRefFields),
            )

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
