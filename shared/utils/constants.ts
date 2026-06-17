/**
 * Header names used by request security middleware/helpers.
 */
export const SECURITY_HEADERS = {
	/** Turnstile token header sent by clients to protected routes. */
	turnstileToken: 'x-turnstile-token',
	/** Admin bypass token header used for server-to-server testing. */
	adminToken: 'x-api-token'
} as const

/**
 * Action keys for Turnstile verification.
 */
export const TURNSTILE_ACTIONS = {
	/**
	 * Action key for Turnstile verification when joining a household.
	 */
	join_household: 'join_household'
} as const
