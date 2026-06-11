/**
 * Redirects shell entry paths to the default app route.
 */
export default defineNuxtRouteMiddleware(async (to) => {
	if (to.path === '/' || to.path === '/app') {
		return navigateTo({
			path: '/app/lists'
		})
	}
})
