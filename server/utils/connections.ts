import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'

// ─── Types ────────────────────────────────────────────────────────────────────
export interface CustomConnection {
    key: string
    label: string
    uri: string
}

interface ConnectionsFile {
    connections: CustomConnection[]
}

export interface SourceInfo {
    key: string
    label: string
    description: string
    origin: 'env' | 'custom'
}

// ─── File path ────────────────────────────────────────────────────────────────
const DATA_FILE = resolve(process.cwd(), 'server/data/connections.json')

// ─── Custom Connections (JSON file) ───────────────────────────────────────────
function ensureDataFile() {
    if (!existsSync(DATA_FILE)) {
        const dir = dirname(DATA_FILE)
        if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
        writeFileSync(DATA_FILE, JSON.stringify({ connections: [] }, null, 2), 'utf-8')
    }
}

export function readCustomConnections(): CustomConnection[] {
    ensureDataFile()
    try {
        const raw = readFileSync(DATA_FILE, 'utf-8')
        const data: ConnectionsFile = JSON.parse(raw)
        return data.connections || []
    }
    catch {
        return []
    }
}

export function writeCustomConnections(connections: CustomConnection[]) {
    ensureDataFile()
    writeFileSync(DATA_FILE, JSON.stringify({ connections }, null, 2), 'utf-8')
}

export function addCustomConnection(conn: CustomConnection) {
    const all = readCustomConnections()
    // Replace if same key exists
    const idx = all.findIndex(c => c.key === conn.key)
    if (idx >= 0) all[idx] = conn
    else all.push(conn)
    writeCustomConnections(all)
}

export function removeCustomConnection(key: string): boolean {
    const all = readCustomConnections()
    const filtered = all.filter(c => c.key !== key)
    if (filtered.length === all.length) return false
    writeCustomConnections(filtered)
    return true
}

// ─── Env Scanning ─────────────────────────────────────────────────────────────

/** Convert env key segments to a human-readable label */
function humanize(envKey: string): string {
    // NUXT_DONO_MONGODB_URI → DONO
    // NUXT_CULTURALGOURMET_MONGODB_URI → CULTURALGOURMET
    // NUXT_MONGODB_URI → '' (primary)
    const match = envKey.match(/^NUXT_(.+)_MONGODB_URI$/)
    if (!match) return 'Primary'
    const raw = match[1]!

    // Known multi-word keys (add more as needed)
    const knownLabels: Record<string, string> = {
        STREETSMART: 'Street Smart',
        CULTURALGOURMET: 'Cultural Gourmet',
        LAGNIAPPEPRO: 'LagniappePRO',
        NASHVILLE: 'Nashville ClearBra',
    }
    if (knownLabels[raw]) return knownLabels[raw]!

    // Default: title-case (DONO → Dono, MYDB → Mydb)
    return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase()
}

/** Derive the runtime config key that Nuxt auto-generates from the env var name */
export function envKeyToConfigKey(envKey: string): string {
    // NUXT_MONGODB_URI → mongodbUri
    // NUXT_DONO_MONGODB_URI → donoMongodbUri
    // Nuxt converts NUXT_FOO_BAR → fooBar (camelCase after stripping NUXT_)
    const withoutNuxt = envKey.replace(/^NUXT_/, '')
    return withoutNuxt
        .split('_')
        .map((seg, i) => i === 0 ? seg.toLowerCase() : seg.charAt(0).toUpperCase() + seg.slice(1).toLowerCase())
        .join('')
}

/** Derive the source key from an env var name */
export function envKeyToSourceKey(envKey: string): string {
    // NUXT_MONGODB_URI → adeel (special primary)
    if (envKey === 'NUXT_MONGODB_URI') return 'adeel'
    // NUXT_DONO_MONGODB_URI → dono
    const match = envKey.match(/^NUXT_(.+)_MONGODB_URI$/)
    return match ? match[1]!.toLowerCase() : envKey.toLowerCase()
}

/** Scan process.env for all NUXT_*_MONGODB_URI variables */
export function scanEnvSources(): SourceInfo[] {
    const results: SourceInfo[] = []
    for (const key of Object.keys(process.env)) {
        if (key === 'NUXT_MONGODB_URI' || (key.startsWith('NUXT_') && key.endsWith('_MONGODB_URI'))) {
            const sourceKey = envKeyToSourceKey(key)
            const label = key === 'NUXT_MONGODB_URI' ? 'Adeel' : humanize(key)
            results.push({
                key: sourceKey,
                label,
                description: `${label} database cluster`,
                origin: 'env',
            })
        }
    }
    return results
}

/** Get all sources (env + custom), deduplicated by key */
export function getAllSources(): SourceInfo[] {
    const envSources = scanEnvSources()
    const customConns = readCustomConnections()

    const customSources: SourceInfo[] = customConns.map(c => ({
        key: c.key,
        label: c.label,
        description: `${c.label} database cluster`,
        origin: 'custom' as const,
    }))

    // Env sources take priority — filter out customs that share a key with env
    const envKeys = new Set(envSources.map(s => s.key))
    const unique = customSources.filter(s => !envKeys.has(s.key))

    return [...envSources, ...unique]
}

/** Get the MongoDB URI for a given source key, checking env first then custom */
export function getSourceUri(sourceKey: string): string | null {
    // 1. Check env — try the special 'adeel' → NUXT_MONGODB_URI mapping first
    if (sourceKey === 'adeel') {
        return process.env.NUXT_MONGODB_URI || null
    }

    // Try NUXT_{KEY}_MONGODB_URI
    const envKey = `NUXT_${sourceKey.toUpperCase()}_MONGODB_URI`
    if (process.env[envKey]) {
        return process.env[envKey]!
    }

    // 2. Check custom connections
    const custom = readCustomConnections().find(c => c.key === sourceKey)
    if (custom) return custom.uri

    return null
}
