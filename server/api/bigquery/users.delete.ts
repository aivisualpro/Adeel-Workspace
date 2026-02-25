export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)

    if (!body.email) {
      throw createError({ statusCode: 400, statusMessage: 'Email is required to delete a user' })
    }

    const escape = (v: string) => (v || '').replace(/'/g, "\\'")
    const sql = `DELETE FROM \`appsheet-417200.SWSCRMV4.Users\` WHERE Email = '${escape(body.email)}'`

    await queryBigQuery(sql)
    return { success: true, message: 'User deleted successfully' }
  }
  catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    throw createError({ statusCode: 500, statusMessage: `Failed to delete user: ${message}` })
  }
})
