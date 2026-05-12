// Global route guard — runs on every navigation
// Redirects unauthenticated users to /login, and prevents
// authenticated users from seeing the login page again.
export default defineNuxtRouteMiddleware((to) => {
  const { isAuthenticated } = useAuth()

  const publicRoutes = ['/login', '/forgot-password', '/register']
  const isPublic = publicRoutes.includes(to.path)

  if (!isAuthenticated.value && !isPublic) {
    return navigateTo('/login')
  }

  if (isAuthenticated.value && to.path === '/login') {
    return navigateTo('/')
  }
})
