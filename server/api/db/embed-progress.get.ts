import { getEmbedProgress } from './embed-array.post'

export default defineEventHandler(async (event) => {
    const query = getQuery(event)
    const sessionId = query.sessionId as string

    if (!sessionId) {
        throw createError({ statusCode: 400, message: 'sessionId is required' })
    }

    const progress = getEmbedProgress(sessionId)
    if (!progress) {
        return {
            status: 'idle',
            total: 0,
            matched: 0,
            unmatched: 0,
            documentsUpdated: 0,
            processed: 0,
            percentage: 0,
            message: 'No active embed session',
            csvFields: [],
            unmatchedSamples: [],
            elapsed: 0,
            speed: 0,
            eta: 0,
            remainingRecords: 0,
        }
    }

    return { ...progress }
})
