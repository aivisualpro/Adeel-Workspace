import { getUpsertProgress } from './upsert.post'

/**
 * GET /api/db/upsert-progress?sessionId=xxx
 * Returns the current progress for an upsert operation.
 */
export default defineEventHandler((event) => {
    const query = getQuery(event)
    const sessionId = query.sessionId as string

    if (!sessionId) {
        throw createError({ statusCode: 400, message: 'sessionId is required' })
    }

    const progress = getUpsertProgress(sessionId)
    if (!progress) {
        return {
            status: 'idle',
            total: 0,
            inserted: 0,
            updated: 0,
            processed: 0,
            batchesDone: 0,
            totalBatches: 0,
            message: 'No session found',
            fields: [],
            elapsed: 0,
            speed: 0,
            remainingRecords: 0,
            percentage: 0,
            eta: 0,
        }
    }

    return progress
})
