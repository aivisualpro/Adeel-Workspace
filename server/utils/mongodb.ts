import { MongoClient } from 'mongodb'

type SourceKey = 'adeel' | 'streetsmart'

const connectionMap: Record<SourceKey, { envKey: string, label: string }> = {
    adeel: { envKey: 'NUXT_MONGODB_URI', label: 'Adeel' },
    streetsmart: { envKey: 'NUXT_STREETSMART_MONGODB_URI', label: 'Street Smart' },
}

// Maintain separate client pools per source
const _clients: Partial<Record<SourceKey, MongoClient>> = {}

/**
 * Get a MongoClient for the given source.
 * - 'adeel'       → uses NUXT_MONGODB_URI
 * - 'streetsmart'  → uses NUXT_STREETSMART_MONGODB_URI
 *
 * Defaults to 'adeel' when no source is provided for backwards compatibility.
 */
export async function getMongoClient(source?: string): Promise<MongoClient> {
    const key = (source && source in connectionMap ? source : 'adeel') as SourceKey
    const config = connectionMap[key]

    if (!_clients[key]) {
        const uri = (globalThis as any).process?.env?.[config.envKey] || 'mongodb://localhost:27017'
        console.log(`[MongoDB:${config.label}] Connecting to:`, uri.replace(/\/\/.*@/, '//<credentials>@'))

        const client = new MongoClient(uri)
        try {
            await client.connect()
            console.log(`[MongoDB:${config.label}] Connected successfully`)
            _clients[key] = client
        }
        catch (err) {
            throw err
        }
    }

    return _clients[key]!
}
