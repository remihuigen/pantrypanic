import { defineEventHandler, sendNoContent } from 'h3'

/**
 * Clears the current user session.
 */
export default defineEventHandler(async (event) => {
	await clearUserSession(event)

	return sendNoContent(event)
})
