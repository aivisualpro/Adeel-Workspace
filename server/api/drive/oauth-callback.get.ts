import { google } from 'googleapis'

/**
 * Google redirects here after user authorizes.
 * Displays the refresh_token to copy into .env.local.
 */
export default defineEventHandler(async (event) => {
  const { code } = getQuery(event) as { code: string }
  if (!code) {
    throw createError({ statusCode: 400, statusMessage: 'Missing auth code' })
  }

  const { drive } = useRuntimeConfig()
  const redirectUri = `${getRequestURL(event).origin}/api/drive/oauth-callback`
  const oauth2Client = new google.auth.OAuth2(drive.clientId, drive.clientSecret, redirectUri)

  const { tokens } = await oauth2Client.getToken(code)

  return {
    message: '✅ Authorization successful! Copy the refresh_token below to your .env.local file.',
    instruction: 'Add this line to .env.local: NUXT_DRIVE_REFRESH_TOKEN=<paste token>',
    refresh_token: tokens.refresh_token,
    note: 'You only need to do this once. Then restart the dev server.',
  }
})
