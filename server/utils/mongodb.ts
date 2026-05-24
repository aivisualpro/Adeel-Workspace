import { MongoClient } from 'mongodb'
import { getSourceUri } from './connections'

// Maintain separate client pools per source key
const _clients: Record<string, MongoClient> = {}

/**
 * Get a MongoClient for the given source.
 *
 * Dynamically resolves the MongoDB URI by:
 *   1. Checking env vars (NUXT_{KEY}_MONGODB_URI)
 *   2. Checking custom connections (server/data/connections.json)
 *
 * Defaults to 'adeel' when no source is provided for backwards compatibility.
 */
export async function getMongoClient(source?: string): Promise<MongoClient> {
    const key = source || 'adeel'

    if (!_clients[key]) {
        const uri = getSourceUri(key)
        if (!uri) {
            throw new Error(`[MongoDB] No connection URI found for source "${key}". Add NUXT_${key.toUpperCase()}_MONGODB_URI to .env or add it via the Connection Manager.`)
        }

        console.log(`[MongoDB:${key}] Connecting to:`, uri.replace(/\/\/.*@/, '//<credentials>@'))

        const client = new MongoClient(uri)
        try {
            await client.connect()
            console.log(`[MongoDB:${key}] Connected successfully`)
            _clients[key] = client
        }
        catch (err) {
            throw err
        }
    }

    return _clients[key]!
}

/**
 * Disconnect and remove a cached client (e.g. when a custom connection is deleted).
 */
export async function disconnectMongoClient(source: string) {
    const client = _clients[source]
    if (client) {
        try {
            await client.close()
        }
        catch { /* silent */ }
        delete _clients[source]
    }
}
