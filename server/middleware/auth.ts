import { isAuthenticated } from '#server/utils/auth'
import { defineEventHandler, getRequestURL, setResponseStatus } from 'h3'

const PROTECTED_PATH_PREFIXES = ['/api/', '/images/']
const PUBLIC_PATHS = new Set(['/api/auth/login', '/api/_auth/session'])
const PUBLIC_PATH_PREFIXES = ['/api/_nuxt']

/**
 * Protects server API and blob image routes with session or admin API key authentication.
 */
export default defineEventHandler(async (event) => {
	const pathname = getRequestURL(event).pathname

	if (!PROTECTED_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
		return
	}

	if (PUBLIC_PATHS.has(pathname)) {
		return
	}

	if (PUBLIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
		return
	}

	if (await isAuthenticated(event)) {
		return
	}

	setResponseStatus(event, 401, 'Unauthorized')

	return {
		success: false,
		error: {
			code: 'UNAUTHORIZED',
			message: 'Je bent niet ingelogd.'
		}
	}
})
