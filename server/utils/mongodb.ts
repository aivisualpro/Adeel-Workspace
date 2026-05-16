import { MongoClient } from 'mongodb'

type SourceKey = 'adeel' | 'streetsmart' | 'culturalgourmet' | 'lagniappepro' | 'nashville'

const connectionMap: Record<SourceKey, { configKey: string, label: string }> = {
    adeel: { configKey: 'mongodbUri', label: 'Adeel' },
    streetsmart: { configKey: 'streetsmartMongodbUri', label: 'Street Smart' },
    culturalgourmet: { configKey: 'culturalgourmetMongodbUri', label: 'Cultural Gourmet' },
    lagniappepro: { configKey: 'lagniappeproMongodbUri', label: 'LagniappePRO' },
    nashville: { configKey: 'nashvilleMongodbUri', label: 'Nashville ClearBra' },
}

// Maintain separate client pools per source
const _clients: Partial<Record<SourceKey, MongoClient>> = {}

/**
 * Get a MongoClient for the given source.
 * - 'adeel'          → uses NUXT_MONGODB_URI
 * - 'streetsmart'    → uses NUXT_STREETSMART_MONGODB_URI
 * - 'culturalgourmet'→ uses NUXT_CULTURALGOURMET_MONGODB_URI
 * - 'lagniappepro'   → uses NUXT_LAGNIAPPEPRO_MONGODB_URI
 * - 'nashville'      → uses NUXT_NASHVILLE_MONGODB_URI
 *
 * Defaults to 'adeel' when no source is provided for backwards compatibility.
 */
export async function getMongoClient(source?: string): Promise<MongoClient> {
    const key = (source && source in connectionMap ? source : 'adeel') as SourceKey
    const config = connectionMap[key]

    if (!_clients[key]) {
        const runtimeConfig = useRuntimeConfig()
        const uri = (runtimeConfig as any)[config.configKey] || 'mongodb://localhost:27017'
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
