/**
 * GET /api/bigquery/projects
 * Fetches projects from BigQuery `Projects` table.
 * Only selects the columns needed for the table display.
 * Caches results for 60 seconds to avoid repeated BQ queries.
 */

let _cache: { data: any[], timestamp: number } | null = null
const CACHE_TTL = 60_000 // 60 seconds

const COLUMNS = [
  'Project ID', 'Customer name', 'Customer Address', 'City', 'Zip Code',
  'Branch Name', 'Project Folder', 'Vendor Name', 'Project Type', 'Job Status',
  'Project Status', 'Project Manager', 'Project Manager VA',
  'Finance Manager', 'Finance Manager VA', 'Engineer',
  'Permit Coordinator', 'Sales Rep', 'Project Equipment',
  'Panels Amount', 'KW', 'Watt', 'Utillity', 'Solar Equipment', 'Inverter Type',
  'Batteries Qty', 'SSA Status', 'Solar Install Status',
  'MPU Installed Status', 'Battery Installed Status',
  'Completion Status', 'Final Status', 'PTO Status',
  'Fire Approval Needed', 'Project Price', 'Contract Price', 'Project Net Amount',
  'Project Start', 'Project End', 'Completion Date', 'Final Date',
  'PM Approve Project', 'Finance Ready',
  'PTO Request', 'PTO Submitted', 'PTO Received',
  'AHJ', 'Jurisdiction', 'Create By', 'TimeStamp',
  'Customer ID', 'Customer Email', 'Customer Phone',
]

export default defineEventHandler(async () => {
  try {
    // Return cached data if fresh
    if (_cache && Date.now() - _cache.timestamp < CACHE_TTL) {
      return { success: true, count: _cache.data.length, projects: _cache.data, cached: true }
    }

    const colList = COLUMNS.map(c => `\`${c}\``).join(', ')
    const sql = `SELECT ${colList} FROM \`appsheet-417200.SWSCRMV4.Projects\` ORDER BY \`TimeStamp\` DESC`

    const rows = await queryBigQuery(sql)

    _cache = { data: rows, timestamp: Date.now() }

    return {
      success: true,
      count: rows.length,
      projects: rows,
    }
  }
  catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to fetch projects: ${message}`,
    })
  }
})
