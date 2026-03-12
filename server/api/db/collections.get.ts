import { getMongoClient } from '../../utils/mongodb'

export default defineEventHandler(async (event) => {
    const query = getQuery(event)
    const database = query.database as string
    const source = (query.source as string) || 'adeel'

    if (!database) {
        throw createError({ statusCode: 400, message: 'database is required' })
    }

    const client = await getMongoClient(source)
    const db = client.db(database)
    const collections = await db.listCollections().toArray()

    return {
        collections: collections.map(c => c.name).sort(),
    }
})
