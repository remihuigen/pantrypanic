import { getRouterParam } from 'h3'

import { defineApiHandler } from '#server/utils/api-core'
import { deleteUser, parseUserId } from '#server/utils/user-management'

/**
 * Deletes one user by route id through the shared account deletion flow.
 */
export default defineApiHandler(async (event) => {
	const userId = parseUserId(getRouterParam(event, 'userId'))

	return deleteUser(event, userId)
})
