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
