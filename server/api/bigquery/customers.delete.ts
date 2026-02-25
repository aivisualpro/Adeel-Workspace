/**
 * DELETE /api/bigquery/customers
 *
 * Deletes a customer from BigQuery by `Customer ID`.
 */
export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)

    if (!body.customerId) {
      throw createError({ statusCode: 400, statusMessage: 'Customer ID is required' })
    }

    const sql = 'DELETE FROM `appsheet-417200.SWSCRMV4.Customers` WHERE `Customer ID` = @customerId'
    await queryBigQuery(sql, { customerId: body.customerId })

    return { success: true, message: 'Customer deleted' }
  }
  catch (error: any) {
    const message = error.message || 'Unknown error'
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to delete customer: ${message}`,
    })
  }
})
