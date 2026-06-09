import { defineEventHandler, getRouterParam } from 'h3'

import { getUserById, parseUserId } from '#server/utils/user-management'

/**
 * Returns one public user record by route id.
 */
export default defineEventHandler(async (event) => {
	const userId = parseUserId(getRouterParam(event, 'userId'))

	return getUserById(userId)
})
