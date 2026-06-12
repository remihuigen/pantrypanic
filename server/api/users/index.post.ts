import { createUser } from '#server/utils/user-management'
import { userSchema } from '#shared/utils/schemas/domain'
import { defineEventHandler, readValidatedBody, setResponseStatus } from 'h3'

/**
 * Creates a user from a validated request body.
 */
export default defineEventHandler(async (event) => {
	const body = await readValidatedBody(event, userSchema.parse)
	const user = await createUser(body)

	setResponseStatus(event, 201)
	return user
})
