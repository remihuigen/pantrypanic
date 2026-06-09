import { createError, defineEventHandler, getRequestURL } from 'h3'

import { isAuthenticated } from '#server/utils/auth'

const PROTECTED_PATH_PREFIXES = ['/api/', '/images/']
const PUBLIC_PATHS = new Set(['/api/auth/login', '/api/_auth/session'])

/**
 * Protects server API and blob image routes with session or admin API key authentication.
 */
export default defineEventHandler(async (event) => {
	const pathname = getRequestURL(event).pathname

	if (!PROTECTED_PATH_PREFIXES.some(prefix => pathname.startsWith(prefix))) {
		return
	}

	if (PUBLIC_PATHS.has(pathname)) {
		return
	}

	if (await isAuthenticated(event)) {
		return
	}

	throw createError({
		statusCode: 401,
		statusMessage: 'Unauthorized',
		message: 'Authentication required.'
	})
})
