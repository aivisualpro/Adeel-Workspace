/**
 * POST /api/bigquery/customers
 *
 * Creates a new customer in the BigQuery `Customers` table.
 */
export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)

    const { bigquery: bqConfig } = useRuntimeConfig()
    const dataset = useBigQueryDataset()
    const table = dataset.table('Customers')

    const row = {
      'Customer ID': body.customerId || `CUS-${Date.now()}`,
      'First Name': body.firstName || '',
      'Last Name': body.lastName || '',
      'Secondary Name': body.secondaryName || '',
      'Secondary Last Name': body.secondaryLastName || '',
      'Address': body.address || '',
      'Unit #': body.unit || '',
      'Phone': body.phone || '',
      'Mobile': body.mobile || '',
      'Email': body.email || '',
      'Customer Files': body.customerFiles || '',
      'Update': new Date().toISOString(),
      'Create By': body.createBy || 'CRM',
      'TimeStamp': new Date().toISOString().split('T')[0],
      'seniorCitizen': body.seniorCitizen || 'No',
    }

    await table.insert([row])

    return { success: true, customer: row }
  }
  catch (error: any) {
    const message = error?.errors?.[0]?.message || error.message || 'Unknown error'
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to create customer: ${message}`,
    })
  }
})
