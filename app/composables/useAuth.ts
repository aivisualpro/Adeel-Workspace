// Composable to manage PIN auth session (stored in a cookie)
export const useAuth = () => {
  const AUTH_COOKIE = 'aw_auth'
  const AUTH_VALUE = 'unlocked'

  const authCookie = useCookie(AUTH_COOKIE, {
    maxAge: 60 * 60 * 8, // 8 hours
    sameSite: 'strict',
    secure: false, // set true in production over HTTPS
  })

  const isAuthenticated = computed(() => authCookie.value === AUTH_VALUE)

  function login() {
    authCookie.value = AUTH_VALUE
  }

  function logout() {
    authCookie.value = null
    navigateTo('/login')
  }

  return { isAuthenticated, login, logout }
}
