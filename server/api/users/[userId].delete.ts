import { defineEventHandler, getRouterParam, sendNoContent } from 'h3'

import { deleteUser, parseUserId } from '#server/utils/user-management'

/**
 * Deletes one user by route id.
 */
export default defineEventHandler(async (event) => {
	const userId = parseUserId(getRouterParam(event, 'userId'))

	await deleteUser(userId)

	return sendNoContent(event)
})
