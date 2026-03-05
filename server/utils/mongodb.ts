import { MongoClient } from 'mongodb'

let _client: MongoClient | null = null

export async function getMongoClient(): Promise<MongoClient> {
    if (!_client) {
        // Read directly from process.env — always reliable in Nitro server context
        const uri = (globalThis as any).process?.env?.NUXT_MONGODB_URI || 'mongodb://localhost:27017'
        console.log('[MongoDB] Connecting to:', uri.replace(/\/\/.*@/, '//<credentials>@'))
        _client = new MongoClient(uri)
        try {
            await _client.connect()
            console.log('[MongoDB] Connected successfully')
        }
        catch (err) {
            _client = null // Clear cache so next attempt retries
            throw err
        }
    }

    return _client
}
