export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const search = (query.search as string || '').trim()

    let sql = 'SELECT * FROM `appsheet-417200.SWSCRMV4.Users`'

    if (search) {
      sql += ` WHERE LOWER(CONCAT(IFNULL(\`First Name\`, ''), ' ', IFNULL(\`Last Name\`, ''))) LIKE LOWER(@search)
               OR LOWER(IFNULL(Email, '')) LIKE LOWER(@search)
               OR LOWER(IFNULL(Role, '')) LIKE LOWER(@search)
               OR LOWER(IFNULL(Department, '')) LIKE LOWER(@search)
               OR LOWER(IFNULL(Branch, '')) LIKE LOWER(@search)`
    }

    const params = search ? { search: `%${search}%` } : undefined
    const rows = await queryBigQuery(sql, params)

    return { success: true, count: rows.length, users: rows }
  }
  catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    throw createError({ statusCode: 500, statusMessage: `Failed to fetch users: ${message}` })
  }
})
