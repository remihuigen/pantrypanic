const PUBLIC_ROUTE_PATHS = new Set(['/login', '/logout'])

/**
 * Redirects unauthenticated app route visits to the login page.
 */
export default defineNuxtRouteMiddleware(async (to) => {
	if (PUBLIC_ROUTE_PATHS.has(to.path)) {
		return
	}

	const { fetch, loggedIn, ready } = useUserSession()

	if (!ready.value) {
		await fetch()
	}

	if (!loggedIn.value) {
		return navigateTo({
			path: '/login',
			query: { redirect: to.fullPath }
		})
	}
})
