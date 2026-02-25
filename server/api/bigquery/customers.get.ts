/**
 * GET /api/bigquery/customers
 * Fetches all customers from BigQuery `Customers` table.
 * Caches results for 60 seconds.
 */

let _cache: { data: any[], timestamp: number } | null = null
const CACHE_TTL = 60_000

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const search = (query.search as string || '').trim()

    // Only use cache for non-search requests
    if (!search && _cache && Date.now() - _cache.timestamp < CACHE_TTL) {
      return { success: true, count: _cache.data.length, customers: _cache.data, cached: true }
    }

    let sql = 'SELECT * FROM `appsheet-417200.SWSCRMV4.Customers`'

    if (search) {
      sql += ` WHERE LOWER(CONCAT(IFNULL(\`First Name\`, ''), ' ', IFNULL(\`Last Name\`, ''))) LIKE LOWER(@search)
               OR LOWER(IFNULL(\`Email\`, '')) LIKE LOWER(@search)
               OR LOWER(IFNULL(\`Phone\`, '')) LIKE LOWER(@search)
               OR LOWER(IFNULL(\`Mobile\`, '')) LIKE LOWER(@search)
               OR LOWER(IFNULL(\`Address\`, '')) LIKE LOWER(@search)
               OR LOWER(IFNULL(\`Customer ID\`, '')) LIKE LOWER(@search)`
    }

    sql += ' ORDER BY `TimeStamp` DESC'

    const params = search ? { search: `%${search}%` } : undefined
    const rows = await queryBigQuery(sql, params)

    // Cache non-search results
    if (!search) {
      _cache = { data: rows, timestamp: Date.now() }
    }

    return {
      success: true,
      count: rows.length,
      customers: rows,
    }
  }
  catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to fetch customers: ${message}`,
    })
  }
})
