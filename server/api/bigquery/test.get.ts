/**
 * GET /api/bigquery/test
 *
 * Health-check endpoint that lists all tables in the configured dataset.
 */
export default defineEventHandler(async () => {
  try {
    const { bigquery: bqConfig } = useRuntimeConfig()

    // If credentials are missing, return debug info
    if (!bqConfig.projectId || !bqConfig.clientEmail || !bqConfig.privateKey) {
      return {
        success: false,
        error: 'Missing BigQuery credentials in runtimeConfig',
        debug: {
          projectId: bqConfig.projectId || '(empty)',
          dataset: bqConfig.dataset || '(empty)',
          clientEmail: bqConfig.clientEmail || '(empty)',
          privateKeyPresent: !!bqConfig.privateKey,
        },
      }
    }

    const dataset = useBigQueryDataset()
    const [tables] = await dataset.getTables()

    return {
      success: true,
      project: bqConfig.projectId,
      dataset: bqConfig.dataset,
      tableCount: tables.length,
      tables: tables.map(t => t.id),
    }
  }
  catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    throw createError({
      statusCode: 500,
      statusMessage: `BigQuery connection failed: ${message}`,
    })
  }
})
