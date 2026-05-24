import { removeCustomConnection, getAllSources } from '../../utils/connections'
import { disconnectMongoClient } from '../../utils/mongodb'

/**
 * DELETE /api/db/sources
 * Remove a custom MongoDB connection.
 * Body: { key: string }
 */
export default defineEventHandler(async (event) => {
    const body = await readBody(event)
    const { key } = body

    if (!key) {
        throw createError({ statusCode: 400, message: 'key is required' })
    }

    // Don't allow deleting env-based sources
    const sources = getAllSources()
    const source = sources.find(s => s.key === key)
    if (source && source.origin === 'env') {
        throw createError({ statusCode: 403, message: `Source "${key}" is defined in .env and cannot be deleted from the UI. Remove the NUXT_${key.toUpperCase()}_MONGODB_URI variable from your .env file instead.` })
    }

    // Remove from custom connections
    const removed = removeCustomConnection(key)
    if (!removed) {
        throw createError({ statusCode: 404, message: `Source "${key}" not found in custom connections` })
    }

    // Disconnect any cached client
    await disconnectMongoClient(key)

    // Clean up process.env
    const envKey = `NUXT_${key.toUpperCase()}_MONGODB_URI`
    delete process.env[envKey]

    return { success: true, key }
})
