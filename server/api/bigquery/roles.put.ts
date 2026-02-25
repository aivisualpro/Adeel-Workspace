export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    if (!body.role) throw createError({ statusCode: 400, statusMessage: 'Role name is required' })
    const escape = (v: string) => (v || '').replace(/'/g, "\\'")

    const sql = `
      UPDATE \`appsheet-417200.SWSCRMV4.RoleManagement\`
      SET
        Events = '${escape(body.events)}',
        Customers = '${escape(body.customers)}',
        Projects = '${escape(body.projects)}',
        Documents = '${escape(body.documents)}',
        Notes = '${escape(body.notes)}',
        Users = '${escape(body.users)}',
        \`Project Dashboard Layout\` = '${escape(body.projectDashboardLayout)}',
        \`Project Buttons\` = '${escape(body.projectButtons)}'
      WHERE Role = '${escape(body.role)}'
    `
    await queryBigQuery(sql)
    return { success: true, message: 'Role updated successfully' }
  }
  catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    throw createError({ statusCode: 500, statusMessage: `Failed to update role: ${message}` })
  }
})
