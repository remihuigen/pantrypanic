import { createUserListQuerySchema, listUsers, parseUserQuery } from '#server/utils/user-management'
import { defineEventHandler, getQuery } from 'h3'

/**
 * Lists public user records with limit/offset pagination.
 */
export default defineEventHandler(async (event) => {
	const query = parseUserQuery(
		createUserListQuerySchema(event),
		getQuery(event),
		'Invalid user list query'
	)

	return listUsers(query)
})
