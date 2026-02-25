export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)

    if (!body.email) {
      throw createError({ statusCode: 400, statusMessage: 'Email is required to update a user' })
    }

    const escape = (v: string) => (v || '').replace(/'/g, "\\'")

    const sql = `
      UPDATE \`appsheet-417200.SWSCRMV4.Users\`
      SET
        \`First Name\` = '${escape(body.firstName)}',
        \`Last Name\` = '${escape(body.lastName)}',
        Phone = '${escape(body.phone)}',
        Role = '${escape(body.role)}',
        \`Secondary Role\` = '${escape(body.secondaryRole)}',
        Vendors = '${escape(body.vendors)}',
        Department = '${escape(body.department)}',
        Branch = '${escape(body.branch)}',
        Status = ${body.status === 'true' || body.status === true ? 'TRUE' : 'FALSE'},
        Location = '${escape(body.location)}',
        UTC = ${body.utc ? Number(body.utc) : 0}
      WHERE Email = '${escape(body.email)}'
    `

    await queryBigQuery(sql)
    return { success: true, message: 'User updated successfully' }
  }
  catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    throw createError({ statusCode: 500, statusMessage: `Failed to update user: ${message}` })
  }
})
