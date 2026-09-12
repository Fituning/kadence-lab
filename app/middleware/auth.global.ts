export default defineNuxtRouteMiddleware((to, from) => {
    const { loggedIn } = useUserSession()
    const publicRoutes = ['/login']

    if (publicRoutes.includes(to.path)) {
        return
    }

    if (!loggedIn.value) {
        return navigateTo('/login')
    }
})