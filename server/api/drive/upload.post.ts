import { Readable } from 'node:stream'

export default defineEventHandler(async (event) => {
  try {
    const formData = await readMultipartFormData(event)
    if (!formData || formData.length === 0) {
      throw createError({ statusCode: 400, statusMessage: 'No file provided' })
    }

    const folderIdField = formData.find(f => f.name === 'folderId')
    const folderId = folderIdField?.data?.toString()
    if (!folderId) {
      throw createError({ statusCode: 400, statusMessage: 'folderId is required' })
    }

    const drive = useDrive()

    const fileFields = formData.filter(f => f.name === 'files' && f.filename)
    const uploaded: { id: string, name: string, mimeType: string }[] = []

    for (const file of fileFields) {
      const stream = new Readable()
      stream.push(file.data)
      stream.push(null)

      const res = await drive.files.create({
        requestBody: {
          name: file.filename || 'Untitled',
          parents: [folderId],
        },
        media: {
          mimeType: file.type || 'application/octet-stream',
          body: stream,
        },
        fields: 'id, name, mimeType',
        supportsAllDrives: true,
      })

      if (res.data.id) {
        uploaded.push({
          id: res.data.id,
          name: res.data.name || file.filename || 'Untitled',
          mimeType: res.data.mimeType || file.type || '',
        })
      }
    }

    return {
      success: true,
      uploaded,
      count: uploaded.length,
    }
  }
  catch (err: any) {
    throw createError({
      statusCode: err.statusCode || 500,
      statusMessage: err.data?.statusMessage || err.message || 'Failed to upload files',
    })
  }
})
