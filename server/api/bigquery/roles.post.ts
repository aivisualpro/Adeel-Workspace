export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const escape = (v: string) => (v || '').replace(/'/g, "\\'")

    const sql = `
      INSERT INTO \`appsheet-417200.SWSCRMV4.RoleManagement\`
        (Role, Events, Customers, Projects, Documents, Notes, Users, \`Project Dashboard Layout\`, \`Project Buttons\`)
      VALUES (
        '${escape(body.role)}',
        '${escape(body.events)}',
        '${escape(body.customers)}',
        '${escape(body.projects)}',
        '${escape(body.documents)}',
        '${escape(body.notes)}',
        '${escape(body.users)}',
        '${escape(body.projectDashboardLayout)}',
        '${escape(body.projectButtons)}'
      )
    `
    await queryBigQuery(sql)
    return { success: true, message: 'Role created successfully' }
  }
  catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    throw createError({ statusCode: 500, statusMessage: `Failed to create role: ${message}` })
  }
})
