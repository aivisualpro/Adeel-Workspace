import { getMongoClient } from '../../utils/mongodb'

export default defineEventHandler(async (event) => {
    const body = await readBody(event)
    const { database, collection, source } = body

    if (!database || !collection) {
        throw createError({ statusCode: 400, message: 'database and collection are required' })
    }

    try {
        const client = await getMongoClient(source || 'adeel')
        const admin = client.db('admin')

        // List all databases
        const { databases } = await admin.admin().listDatabases()
        const dbExists = databases.some((db: any) => db.name === database)

        let collectionExists = false
        if (dbExists) {
            const db = client.db(database)
            const collections = await db.listCollections({ name: collection }).toArray()
            collectionExists = collections.length > 0
        }

        return {
            success: true,
            dbExists,
            collectionExists,
            message: !dbExists
                ? `Database "${database}" will be created with collection "${collection}"`
                : !collectionExists
                    ? `Collection "${collection}" will be created in database "${database}"`
                    : `Ready to import into "${database}.${collection}"`,
        }
    }
    catch (err: any) {
        throw createError({ statusCode: 500, message: err.message || 'Failed to connect to MongoDB' })
    }
})
