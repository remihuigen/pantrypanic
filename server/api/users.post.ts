import { defineEventHandler, readValidatedBody, setResponseStatus } from 'h3'

import { createUser, createUserBodySchema } from '#server/utils/user-management'

/**
 * Creates a user from a validated request body.
 */
export default defineEventHandler(async (event) => {
	const body = await readValidatedBody(event, createUserBodySchema.parse)
	const user = await createUser(body)

	setResponseStatus(event, 201)
	return user
})
