export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const search = (query.search as string || '').trim()

    let sql = 'SELECT * FROM `appsheet-417200.SWSCRMV4.RoleManagement`'

    if (search) {
      sql += ` WHERE LOWER(IFNULL(Role, '')) LIKE LOWER(@search)
               OR LOWER(IFNULL(Events, '')) LIKE LOWER(@search)
               OR LOWER(IFNULL(Customers, '')) LIKE LOWER(@search)
               OR LOWER(IFNULL(Projects, '')) LIKE LOWER(@search)
               OR LOWER(IFNULL(Documents, '')) LIKE LOWER(@search)
               OR LOWER(IFNULL(Notes, '')) LIKE LOWER(@search)
               OR LOWER(IFNULL(Users, '')) LIKE LOWER(@search)`
    }

    sql += ' ORDER BY Role ASC'

    const params = search ? { search: `%${search}%` } : undefined
    const rows = await queryBigQuery(sql, params)

    return { success: true, count: rows.length, roles: rows }
  }
  catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    throw createError({ statusCode: 500, statusMessage: `Failed to fetch roles: ${message}` })
  }
})
