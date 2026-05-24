import { getAllSources } from '../../utils/connections'

/**
 * GET /api/db/sources
 * Returns all available MongoDB connection sources (env-discovered + custom).
 */
export default defineEventHandler(() => {
    const sources = getAllSources()
    return { sources }
})
