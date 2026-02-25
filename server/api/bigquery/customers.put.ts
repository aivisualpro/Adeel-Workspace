/**
 * PUT /api/bigquery/customers
 *
 * Updates an existing customer in BigQuery using DML (UPDATE statement).
 * Identifies the customer by `Customer ID`.
 */
export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)

    if (!body.customerId) {
      throw createError({ statusCode: 400, statusMessage: 'Customer ID is required' })
    }

    const setClauses: string[] = []
    const params: Record<string, any> = { customerId: body.customerId }

    const fieldMap: Record<string, string> = {
      firstName: 'First Name',
      lastName: 'Last Name',
      secondaryName: 'Secondary Name',
      secondaryLastName: 'Secondary Last Name',
      address: 'Address',
      unit: 'Unit #',
      phone: 'Phone',
      mobile: 'Mobile',
      email: 'Email',
      customerFiles: 'Customer Files',
      seniorCitizen: 'seniorCitizen',
      createBy: 'Create By',
    }

    for (const [paramKey, colName] of Object.entries(fieldMap)) {
      if (body[paramKey] !== undefined) {
        setClauses.push(`\`${colName}\` = @${paramKey}`)
        params[paramKey] = body[paramKey]
      }
    }

    // Always update the "Update" timestamp
    setClauses.push('`Update` = @updateTs')
    params.updateTs = new Date().toISOString()

    if (setClauses.length === 1) {
      // Only the timestamp, nothing else was provided
      return { success: true, message: 'No fields to update' }
    }

    const sql = `UPDATE \`appsheet-417200.SWSCRMV4.Customers\`
                 SET ${setClauses.join(', ')}
                 WHERE \`Customer ID\` = @customerId`

    await queryBigQuery(sql, params)

    return { success: true, message: 'Customer updated' }
  }
  catch (error: any) {
    const message = error.message || 'Unknown error'
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to update customer: ${message}`,
    })
  }
})
