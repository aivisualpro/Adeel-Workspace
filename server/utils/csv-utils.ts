import { ObjectId } from 'mongodb'

// ─── Types ────────────────────────────────────────────────────────────────────
export interface Reference {
    localField: string       // field in the CSV being imported
    collection: string       // reference collection name (e.g. hardwoodDatabase_Categories)
    refField: string         // field in ref collection to match against
    storeField: string       // field name to store the ObjectId as (e.g. category_id)
}

export type RefMap = Map<string, ObjectId>

// ─── Object-Array Cell Parser ─────────────────────────────────────────────────
/**
 * Parse a cell containing one or more {key: value , ...} blocks.
 * Handles: {name: X , color: Y , icon: Z , variant: V , sortOrder: N , isDefault: B} , {name: ...}
 * Returns an array of objects, or null if the cell doesn't match this format.
 */
export function parseObjectArrayCell(val: string): Record<string, any>[] | null {
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

// ─── Date/Time Parser ─────────────────────────────────────────────────────────
/**
 * Parse a string that looks like a date/time into a UTC Date object.
 * Returns a Date built with Date.UTC() so the literal values are preserved
 * with NO timezone shift — "2024-01-15 08:30" becomes ISODate("2024-01-15T08:30:00Z").
 * Returns null if the value is not a recognisable date/time format.
 *
 * Covered formats:
 *   ISO:       2024-01-15  |  2024-01-15T08:30:00  |  2024-01-15T08:30:00Z  |  2024-01-15T08:30:00+05:00
 *   US/EU:     01/15/2024  |  1/5/2024  |  01.15.2024
 *   Named:     15-Jan-2024  |  Jan 15, 2024  |  January 15, 2024
 *   Datetime:  01/15/2024 08:30  |  2024-01-15 08:30:00  |  3/5/2025 10:30 AM
 */
const MONTH_MAP: Record<string, number> = {
    jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2,
    apr: 3, april: 3, may: 4, jun: 5, june: 5, jul: 6, july: 6,
    aug: 7, august: 7, sep: 8, sept: 8, september: 8,
    oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11,
}

function parseTimeComponents(timeStr: string): { h: number, m: number, s: number, ms: number } {
    const t = timeStr.trim()
    const isPM = /pm$/i.test(t)
    const isAM = /am$/i.test(t)
    const clean = t.replace(/\s*[AaPp][Mm]$/i, '')
    const parts = clean.split(':')
    let h = parseInt(parts[0]!) || 0
    const m = parseInt(parts[1]!) || 0
    const secParts = (parts[2] || '0').split('.')
    const s = parseInt(secParts[0]!) || 0
    const ms = parseInt((secParts[1] || '0').padEnd(3, '0').slice(0, 3)) || 0

    if (isPM && h < 12) h += 12
    if (isAM && h === 12) h = 0

    return { h, m, s, ms }
}

export function parseDateAsUTC(val: string): Date | null {
    const v = val.trim()
    if (!v) return null

    let year: number, month: number, day: number
    let h = 0, m = 0, s = 0, ms = 0

    // ── 1. ISO format: 2024-01-15  |  2024-01-15T08:30:00  |  2024-01-15 08:30:00.123Z
    const isoRe = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ](\d{1,2}:\d{2}(?::\d{2}(?:\.\d+)?)?)(?:\s*[AaPp][Mm])?)?(?:Z|[+-]\d{2}:?\d{0,2})?$/i
    let match = isoRe.exec(v)
    if (match) {
        year = parseInt(match[1]!)
        month = parseInt(match[2]!) - 1
        day = parseInt(match[3]!)
        if (match[4]) {
            const timeRaw = v.slice(v.indexOf(match[4]!)).replace(/Z$|[+-]\d{2}:?\d{0,2}$/i, '').trim()
            const tc = parseTimeComponents(timeRaw)
            h = tc.h; m = tc.m; s = tc.s; ms = tc.ms
        }
        if (month < 0 || month > 11 || day < 1 || day > 31) return null
        return new Date(Date.UTC(year, month, day, h, m, s, ms))
    }

    // ── 2. US/EU with slashes or dots: 01/15/2024 | 1/5/24 | 01.15.2024
    const slashRe = /^(\d{1,2})[/.](\d{1,2})[/.](\d{2,4})(?:\s+(\d{1,2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:\s*[AaPp][Mm])?))?$/i
    match = slashRe.exec(v)
    if (match) {
        const a = parseInt(match[1]!)
        const b = parseInt(match[2]!)
        let yr = parseInt(match[3]!)
        if (yr < 100) yr += 2000
        month = a - 1; day = b; year = yr
        if (month < 0 || month > 11 || day < 1 || day > 31) return null
        if (match[4]) { const tc = parseTimeComponents(match[4]); h = tc.h; m = tc.m; s = tc.s; ms = tc.ms }
        return new Date(Date.UTC(year, month, day, h, m, s, ms))
    }

    // ── 3. Named month first: Jan 15, 2024  |  January 15 2024
    const namedFirstRe = /^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{2,4})(?:\s+(\d{1,2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:\s*[AaPp][Mm])?))?$/i
    match = namedFirstRe.exec(v)
    if (match) {
        const mon = MONTH_MAP[match[1]!.toLowerCase()]
        if (mon === undefined) return null
        day = parseInt(match[2]!)
        year = parseInt(match[3]!)
        if (year < 100) year += 2000
        month = mon
        if (day < 1 || day > 31) return null
        if (match[4]) { const tc = parseTimeComponents(match[4]); h = tc.h; m = tc.m; s = tc.s; ms = tc.ms }
        return new Date(Date.UTC(year, month, day, h, m, s, ms))
    }

    // ── 4. Day-named-month-year: 15-Jan-2024  |  15 January 2024
    const dayNamedRe = /^(\d{1,2})[\s-]([A-Za-z]+)[\s-](\d{2,4})(?:\s+(\d{1,2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:\s*[AaPp][Mm])?))?$/i
    match = dayNamedRe.exec(v)
    if (match) {
        day = parseInt(match[1]!)
        const mon = MONTH_MAP[match[2]!.toLowerCase()]
        if (mon === undefined) return null
        year = parseInt(match[3]!)
        if (year < 100) year += 2000
        month = mon
        if (day < 1 || day > 31) return null
        if (match[4]) { const tc = parseTimeComponents(match[4]); h = tc.h; m = tc.m; s = tc.s; ms = tc.ms }
        return new Date(Date.UTC(year, month, day, h, m, s, ms))
    }

    return null
}

// ─── CSV Parser ───────────────────────────────────────────────────────────────
export function parseCSV(raw: string): { headers: string[], rows: Record<string, string>[] } {
    if (!raw.trim()) return { headers: [], rows: [] }

    // ── Split into logical rows (handles multi-line quoted fields) ────────
    const logicalRows: string[] = []
    let currentRow = ''
    let inQuotes = false

    for (let i = 0; i < raw.length; i++) {
        const ch = raw[i]!

        if (ch === '"') {
            if (inQuotes && i + 1 < raw.length && raw[i + 1] === '"') {
                currentRow += '""'
                i++
            }
            else {
                inQuotes = !inQuotes
                currentRow += ch
            }
        }
        else if ((ch === '\n' || ch === '\r') && !inQuotes) {
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
        let braceDepth = 0

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

// ─── Field Value Coercion ─────────────────────────────────────────────────────
/**
 * Coerce a raw string value from CSV into the appropriate JS type.
 * Handles: empty → null, Y/N → boolean, true/false → boolean,
 * date/time → Date (UTC), currency → number, number → number,
 * {key: value} → object array, comma list → array (if opted in), else string.
 */
export function coerceFieldValue(val: string, key: string, splitAsArrayFields: Set<string>): any {
    if (val === '') return null

    // Y / N → boolean
    if (val === 'Y' || val === 'y') return true
    if (val === 'N' || val === 'n') return false
    if (val.toLowerCase() === 'true') return true
    if (val.toLowerCase() === 'false') return false

    // Date / Time → MongoDB Date (timezone-safe via Date.UTC)
    const dateResult = parseDateAsUTC(val)
    if (dateResult) return dateResult

    // Currency / formatted numbers: $478,541.06  -$1,234.56  1,234,567  €50,000
    if (/^[£€$¥₹]?\s*-?\d{1,3}(,\d{3})*(\.\d+)?$/.test(val.trim()) || /^-?[£€$¥₹]\s*\d{1,3}(,\d{3})*(\.\d+)?$/.test(val.trim())) {
        const cleaned = val.replace(/[^0-9.\-]/g, '')
        return cleaned !== '' ? Number(cleaned) : val
    }

    // Plain number
    if (!isNaN(Number(val)) && val.trim() !== '') return Number(val)

    // {key: value , ...} → array of objects
    if (val.trim().startsWith('{')) {
        const parsed = parseObjectArrayCell(val)
        if (parsed) return parsed
    }

    // Comma-separated list → array (only if explicitly opted in)
    if (val.includes(',') && splitAsArrayFields.has(key)) {
        const parts = val.split(',').map(p => p.trim()).filter(Boolean)
        if (parts.length > 1) {
            return parts.map(p => {
                if (p === 'Y' || p === 'y') return true
                if (p === 'N' || p === 'n') return false
                if (p.toLowerCase() === 'true') return true
                if (p.toLowerCase() === 'false') return false
                if (!isNaN(Number(p)) && p !== '') return Number(p)
                return p
            })
        }
        return parts[0] ?? val
    }

    return val
}

// ─── Reference Resolution ─────────────────────────────────────────────────────
/**
 * Resolve a CSV field value (single or comma-separated) against a lookup map.
 * Returns a single ObjectId, an array of ObjectIds, or null.
 */
export function resolveReference(
    val: string,
    ref: Reference,
    lookupMap: RefMap | undefined,
    refStats: Record<string, { hit: number, miss: number, empty: number }>,
    key: string,
): { storeField: string, value: ObjectId | ObjectId[] | null } {
    const rawVal = val.trim()

    // ── Multi-value: comma-separated list → array of ObjectIds ──
    if (rawVal.includes(',')) {
        const parts = rawVal.split(',').map(p => p.trim()).filter(Boolean)
        const objectIds: ObjectId[] = []

        for (const part of parts) {
            const lookupKey = part.toLowerCase()
            const objectId = lookupMap?.get(lookupKey) ?? lookupMap?.get(part) ?? null

            if (refStats[key]) {
                if (!lookupKey) refStats[key].empty++
                else if (objectId) refStats[key].hit++
                else refStats[key].miss++
            }

            if (!objectId && lookupKey && (refStats[key]?.miss ?? 0) <= 3) {
                console.log(`[RefLookup:MISS] CSV field "${key}" value "${part}" (key: "${lookupKey}") not found in lookup map (${lookupMap?.size ?? 0} entries)`)
            }

            if (objectId) objectIds.push(objectId)
        }

        return { storeField: ref.storeField, value: objectIds }
    }

    // ── Single-value: one value → single ObjectId ───────────
    const lookupKey = rawVal.toLowerCase()
    const objectId = lookupMap?.get(lookupKey) ?? null

    if (refStats[key]) {
        if (!lookupKey) refStats[key].empty++
        else if (objectId) refStats[key].hit++
        else refStats[key].miss++
    }

    if (!objectId && lookupKey && (refStats[key]?.miss ?? 0) <= 3) {
        console.log(`[RefLookup:MISS] CSV field "${key}" value "${val}" (key: "${lookupKey}") not found in lookup map (${lookupMap?.size ?? 0} entries)`)
    }

    return { storeField: ref.storeField, value: objectId }
}

// ─── Build Reference Lookup Maps ──────────────────────────────────────────────
export async function buildRefLookupMaps(
    db: any,
    references: Reference[],
    rows: Record<string, string>[],
): Promise<Map<string, RefMap>> {
    const refMaps = new Map<string, RefMap>()

    for (const ref of references) {
        const refCol = db.collection(ref.collection)
        const isIdField = ref.refField === '_id'

        const projection: Record<string, number> = { _id: 1 }
        if (!isIdField) projection[ref.refField] = 1

        const refDocs = await refCol.find({}, { projection }).toArray()

        console.log(`[RefLookup] Collection "${ref.collection}" → fetched ${refDocs.length} docs, matching field: "${ref.refField}" (isIdField: ${isIdField})`)

        const lookupMap: RefMap = new Map()
        for (const doc of refDocs) {
            const rawVal = isIdField ? doc._id : doc[ref.refField]
            const key = String(rawVal ?? '').trim()
            if (key) {
                lookupMap.set(key.toLowerCase(), doc._id as ObjectId)
                lookupMap.set(key, doc._id as ObjectId)
            }
        }

        const sampleKeys = Array.from(lookupMap.keys()).slice(0, 10)
        console.log(`[RefLookup] Built lookup map with ${lookupMap.size} entries. Sample keys:`, sampleKeys)

        const sampleCSVValues = rows.slice(0, 5).map(r => r[ref.localField]).filter(Boolean)
        console.log(`[RefLookup] Sample CSV values for "${ref.localField}":`, sampleCSVValues)

        refMaps.set(ref.localField, lookupMap)
    }

    return refMaps
}

// ─── Build Document from CSV Row ──────────────────────────────────────────────
/**
 * Convert a raw CSV row into a MongoDB document, applying type coercion
 * and reference resolution.
 */
export function buildDocument(
    row: Record<string, string>,
    references: Reference[],
    refMaps: Map<string, RefMap>,
    refStats: Record<string, { hit: number, miss: number, empty: number }>,
    splitAsArrayFields: Set<string>,
): Record<string, any> {
    const doc: Record<string, any> = {}

    for (const [key, val] of Object.entries(row)) {
        const ref = references.find(r => r.localField === key)

        if (ref) {
            const lookupMap = refMaps.get(key)
            const resolved = resolveReference(val, ref, lookupMap, refStats, key)
            doc[resolved.storeField] = resolved.value
        }
        else {
            doc[key] = coerceFieldValue(val, key, splitAsArrayFields)
        }
    }

    return doc
}
