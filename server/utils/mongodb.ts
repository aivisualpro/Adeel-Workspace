import { MongoClient } from 'mongodb'

let _client: MongoClient | null = null

export async function getMongoClient(): Promise<MongoClient> {
    if (!_client) {
        const config = useRuntimeConfig()
        const uri = (config.mongodbUri as string) || 'mongodb://localhost:27017'
        _client = new MongoClient(uri)
        await _client.connect()
    }

    return _client
}
