import { google } from 'googleapis'

/**
 * Visit /api/drive/auth in your browser to start the OAuth flow.
 * After authorizing, you'll get a refresh_token to add to .env.local.
 */
export default defineEventHandler(async (event) => {
  const { drive } = useRuntimeConfig()

  if (!drive.clientId || !drive.clientSecret) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Set NUXT_DRIVE_CLIENT_ID and NUXT_DRIVE_CLIENT_SECRET in .env.local first',
    })
  }

  const redirectUri = `${getRequestURL(event).origin}/api/drive/oauth-callback`
  const oauth2Client = new google.auth.OAuth2(drive.clientId, drive.clientSecret, redirectUri)

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/drive'],
  })

  return sendRedirect(event, authUrl)
})
