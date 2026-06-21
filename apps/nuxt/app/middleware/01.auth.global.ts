/**
 * Redirects unauthenticated product-app route visits to the login page.
 */
export default defineNuxtRouteMiddleware(async (to) => {
	if (!to.path.startsWith('/app')) {
		return
	}

	const { fetch, loggedIn } = useUserSession()

	await fetch()

	if (!loggedIn.value) {
		return navigateTo({
			path: '/login',
			query: { redirect: to.fullPath }
		})
	}
})
