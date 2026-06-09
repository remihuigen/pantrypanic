import type { H3Event } from 'h3'
import { createError, getHeader } from 'h3'

const ADMIN_API_KEY_HEADER = 'x-api-token'

/**
 * Checks whether a server request is authenticated by session or admin API key.
 *
 * @param event - H3 request event to inspect.
 * @returns Whether the request has a valid user session or configured `x-api-token` value.
 */
export async function isAuthenticated(event: H3Event): Promise<boolean> {
	if (hasValidAdminApiKey(event)) {
		return true
	}

	const session = await getUserSession(event)

	return Boolean(session.user)
}

/**
 * Requires a server request to be authenticated by session or admin API key.
 *
 * @param event - H3 request event to inspect.
 * @throws HTTP 401 when the request is not authenticated.
 */
export async function requireAuthenticated(event: H3Event): Promise<void> {
	if (await isAuthenticated(event)) {
		return
	}

	throw createError({
		statusCode: 401,
		statusMessage: 'Unauthorized',
		message: 'Authentication required.'
	})
}

function hasValidAdminApiKey(event: H3Event): boolean {
	const configuredKey = getConfiguredAdminApiKey(event)
	const requestKey = getHeader(event, ADMIN_API_KEY_HEADER)

	return constantTimeEqual(requestKey, configuredKey)
}

function getConfiguredAdminApiKey(event: H3Event): string {
	const runtimeConfig = useRuntimeConfig(event)
	const runtimeKey = typeof runtimeConfig.adminApiKey === 'string' ? runtimeConfig.adminApiKey : ''
	const legacyRuntimeToken = typeof runtimeConfig.adminApiToken === 'string' ? runtimeConfig.adminApiToken : ''

	return process.env.ADMIN_API_KEY || runtimeKey || process.env.ADMIN_API_TOKEN || legacyRuntimeToken
}

function constantTimeEqual(left: string | undefined, right: string | undefined): boolean {
	if (!left || !right || left.length !== right.length) {
		return false
	}

	let difference = 0

	for (let index = 0; index < left.length; index += 1) {
		difference |= left.charCodeAt(index) ^ right.charCodeAt(index)
	}

	return difference === 0
}
