import { google } from 'googleapis'
import type { drive_v3 } from 'googleapis'

/**
 * Returns a Google Drive v3 client.
 *
 * Strategy:
 *  - If drive.refreshToken is set → uses OAuth2 (real user credentials, has quota)
 *  - Otherwise → falls back to service account JWT (read-only, no upload quota)
 */
export function useDrive(): drive_v3.Drive {
  const { bigquery, drive } = useRuntimeConfig()

  // ── OAuth2 path (preferred — has storage quota) ──
  if (drive.clientId && drive.clientSecret && drive.refreshToken) {
    const oauth2Client = new google.auth.OAuth2(drive.clientId, drive.clientSecret)
    oauth2Client.setCredentials({ refresh_token: drive.refreshToken })
    return google.drive({ version: 'v3', auth: oauth2Client })
  }

  // ── Service account fallback (listing works, uploads fail) ──
  const clientEmail = bigquery.clientEmail
  const privateKey = bigquery.privateKey?.replace(/\\n/g, '\n')

  if (!clientEmail || !privateKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Google credentials not configured. Set OAuth2 tokens or service account keys.',
    })
  }

  console.warn('[Drive] Using service account — uploads will fail. Run /api/drive/auth to set up OAuth2.')

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  })

  return google.drive({ version: 'v3', auth })
}
