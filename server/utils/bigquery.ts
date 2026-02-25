import { BigQuery } from '@google-cloud/bigquery'

let _bigquery: BigQuery | null = null

/**
 * Returns a singleton BigQuery client, authenticated via
 * service-account credentials stored in runtimeConfig.bigquery.
 */
export function useBigQuery(): BigQuery {
  if (!_bigquery) {
    const { bigquery } = useRuntimeConfig()
    const projectId = bigquery.projectId
    const clientEmail = bigquery.clientEmail
    const privateKey = bigquery.privateKey?.replace(/\\n/g, '\n')

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error(
        'Missing BigQuery credentials. '
        + 'Ensure NUXT_BIGQUERY_PROJECT_ID, NUXT_BIGQUERY_CLIENT_EMAIL, and NUXT_BIGQUERY_PRIVATE_KEY are set in .env.local',
      )
    }

    _bigquery = new BigQuery({
      projectId,
      credentials: {
        client_email: clientEmail,
        private_key: privateKey,
      },
    })
  }

  return _bigquery
}

/**
 * Convenience: returns the configured dataset reference.
 */
export function useBigQueryDataset() {
  const { bigquery } = useRuntimeConfig()
  const datasetName = bigquery.dataset || 'SWSCRMV4'
  return useBigQuery().dataset(datasetName)
}

/**
 * Run an arbitrary SQL query against BigQuery and return the rows.
 */
export async function queryBigQuery<T = Record<string, unknown>>(
  sql: string,
  params?: Record<string, unknown>,
): Promise<T[]> {
  const bq = useBigQuery()
  const [rows] = await bq.query({
    query: sql,
    params,
    location: 'US', // change if your dataset is in a different region
  })
  return rows as T[]
}
