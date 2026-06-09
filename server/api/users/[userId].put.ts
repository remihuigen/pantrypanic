import { defineEventHandler, getRouterParam, readValidatedBody } from 'h3'

import { parseUserId, updateUser, updateUserBodySchema } from '#server/utils/user-management'

/**
 * Updates one or more user fields for a route id using PUT.
 */
export default defineEventHandler(async (event) => {
	const userId = parseUserId(getRouterParam(event, 'userId'))
	const body = await readValidatedBody(event, updateUserBodySchema.parse)

	return updateUser(userId, body)
})
