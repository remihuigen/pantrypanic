import { defineEventHandler, getQuery } from 'h3'

import { listUsers, parseUserQuery, userListQuerySchema } from '#server/utils/user-management'

/**
 * Lists public user records with limit/offset pagination.
 */
export default defineEventHandler(async (event) => {
	const query = parseUserQuery(userListQuerySchema, getQuery(event), 'Invalid user list query')

	return listUsers(query)
})
