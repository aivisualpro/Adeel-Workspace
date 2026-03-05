import { getProgress } from './import.post'

export default defineEventHandler(async (event) => {
    const query = getQuery(event)
    const sessionId = query.sessionId as string

    if (!sessionId) {
        throw createError({ statusCode: 400, message: 'sessionId is required' })
    }

    const progress = getProgress(sessionId)
    if (!progress) {
        return {
            status: 'idle',
            total: 0,
            imported: 0,
            batchesDone: 0,
            totalBatches: 0,
            message: 'No active import session',
            fields: [],
            elapsed: 0,
        }
    }

    const pct = progress.total > 0 ? Math.round((progress.imported / progress.total) * 100) : 0
    const remainingRecords = progress.total - progress.imported
    const speed = progress.elapsed > 0 ? Math.round(progress.imported / (progress.elapsed / 1000)) : 0
    const eta = speed > 0 ? Math.round(remainingRecords / speed) : 0

    return {
        ...progress,
        percentage: pct,
        remainingRecords,
        speed,
        eta,
    }
})
