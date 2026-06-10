const PUBLIC_ROUTE_PATHS = new Set(['/login', '/logout'])

/**
 * Redirects unauthenticated app route visits to the login page.
 */
export default defineNuxtRouteMiddleware(async (to) => {
	if (to.path === '/') {
		return navigateTo({
			path: '/lists'
		})
	}
})
