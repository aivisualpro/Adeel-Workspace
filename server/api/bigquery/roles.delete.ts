export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    if (!body.role) throw createError({ statusCode: 400, statusMessage: 'Role name is required' })
    const escape = (v: string) => (v || '').replace(/'/g, "\\'")
    const sql = `DELETE FROM \`appsheet-417200.SWSCRMV4.RoleManagement\` WHERE Role = '${escape(body.role)}'`
    await queryBigQuery(sql)
    return { success: true, message: 'Role deleted successfully' }
  }
  catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    throw createError({ statusCode: 500, statusMessage: `Failed to delete role: ${message}` })
  }
})
