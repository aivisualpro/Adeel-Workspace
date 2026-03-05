import { getMongoClient } from '../../utils/mongodb'

export default defineEventHandler(async () => {
    const client = await getMongoClient()
    const adminDb = client.db('admin')
    const result = await adminDb.command({ listDatabases: 1, nameOnly: true })

    // Filter out system databases
    const systemDbs = new Set(['admin', 'local', 'config'])
    const databases: string[] = (result.databases as { name: string }[])
        .map(d => d.name)
        .filter(name => !systemDbs.has(name))
        .sort()

    return { databases }
})
