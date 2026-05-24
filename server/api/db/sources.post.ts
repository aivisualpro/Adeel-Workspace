import { MongoClient } from 'mongodb'
import { addCustomConnection, getAllSources } from '../../utils/connections'

/**
 * POST /api/db/sources
 * Add a new custom MongoDB connection.
 * Body: { label: string, uri: string, key?: string }
 */
export default defineEventHandler(async (event) => {
    const body = await readBody(event)
    const { label, uri, key: providedKey } = body

    if (!label || !uri) {
        throw createError({ statusCode: 400, message: 'label and uri are required' })
    }

    // Auto-generate key from label if not provided
    const key = (providedKey || label)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '')
        .slice(0, 30)

    if (!key) {
        throw createError({ statusCode: 400, message: 'Could not generate a valid key from the label' })
    }

    // Check if this key already exists as an env-based source
    const existing = getAllSources()
    const envSource = existing.find(s => s.key === key && s.origin === 'env')
    if (envSource) {
        throw createError({ statusCode: 409, message: `Source "${key}" already exists from .env and cannot be overwritten` })
    }

    // Validate connection by pinging
    const client = new MongoClient(uri)
    try {
        await client.connect()
        const admin = client.db().admin()
        await admin.ping()
        console.log(`[Sources] Connection test passed for "${label}"`)
    }
    catch (err: any) {
        throw createError({
            statusCode: 400,
            message: `Connection test failed: ${err.message || 'Could not connect'}`,
        })
    }
    finally {
        try { await client.close() } catch { /* silent */ }
    }

    // Save to custom connections
    addCustomConnection({ key, label, uri })

    // Also register in process.env so getMongoClient can pick it up immediately
    const envKey = `NUXT_${key.toUpperCase()}_MONGODB_URI`
    process.env[envKey] = uri

    return { success: true, key, label }
})
