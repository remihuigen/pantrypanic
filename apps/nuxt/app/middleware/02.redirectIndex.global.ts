/**
 * Redirects the authenticated app shell entry path to the default app route.
 */
export default defineNuxtRouteMiddleware(async (to) => {
	if (to.path === '/app') {
		return navigateTo({
			path: '/app/lists'
		})
	}
})
