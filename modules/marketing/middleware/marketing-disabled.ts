const MARKETING_ROUTES = new Set<string>(['/'])

const MARKETING_PATH_PREFIXES = ['/blog']

export default defineNuxtRouteMiddleware((to, _from) => {
	// if marketing route, redirect to /login
	if (
		MARKETING_ROUTES.has(to.path) ||
		MARKETING_PATH_PREFIXES.some((prefix) => to.path.startsWith(prefix))
	) {
		return navigateTo('/login')
	}
})
