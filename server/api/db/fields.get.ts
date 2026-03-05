import { getMongoClient } from '../../utils/mongodb'

export default defineEventHandler(async (event) => {
    const query = getQuery(event)
    const database = query.database as string
    const collection = query.collection as string

    if (!database || !collection) {
        throw createError({ statusCode: 400, message: 'database and collection are required' })
    }

    const client = await getMongoClient()
    const db = client.db(database)
    const col = db.collection(collection)

    // Sample up to 20 documents to infer field names
    const samples = await col.find({}).limit(20).toArray()

    const fieldSet = new Set<string>()
    for (const doc of samples) {
        for (const key of Object.keys(doc)) {
            if (key !== '_id') fieldSet.add(key)
        }
    }

    return {
        fields: Array.from(fieldSet).sort(),
    }
})
