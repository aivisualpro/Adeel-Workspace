export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)

    const escape = (v: string) => (v || '').replace(/'/g, "\\'")

    const sql = `
      INSERT INTO \`appsheet-417200.SWSCRMV4.Users\`
        (\`First Name\`, \`Last Name\`, Email, Phone, Role, \`Secondary Role\`, Vendors, Department, Branch, Status, Location, UTC)
      VALUES (
        '${escape(body.firstName)}',
        '${escape(body.lastName)}',
        '${escape(body.email)}',
        '${escape(body.phone)}',
        '${escape(body.role)}',
        '${escape(body.secondaryRole)}',
        '${escape(body.vendors)}',
        '${escape(body.department)}',
        '${escape(body.branch)}',
        ${body.status === 'true' || body.status === true ? 'TRUE' : 'FALSE'},
        '${escape(body.location)}',
        ${body.utc ? Number(body.utc) : 0}
      )
    `

    await queryBigQuery(sql)
    return { success: true, message: 'User created successfully' }
  }
  catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    throw createError({ statusCode: 500, statusMessage: `Failed to create user: ${message}` })
  }
})
