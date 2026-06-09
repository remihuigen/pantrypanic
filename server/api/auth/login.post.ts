import { createError, defineEventHandler, readValidatedBody } from 'h3'
import { z } from 'zod'

import {
	findUserForAuthentication,
	serializeUser,
	updateUserPasswordHash
} from '#server/utils/user-management'
import {
	hashUserPassword,
	isUserPasswordHash,
	userPasswordNeedsRehash,
	verifyUserPasswordHash
} from '#server/utils/password-hashing'

const loginBodySchema = z.strictObject({
	email: z.email().trim().toLowerCase(),
	password: z.string().min(1).max(1024)
})

/**
 * Authenticates an email/password login and creates a user session.
 */
export default defineEventHandler(async (event) => {
	const body = await readValidatedBody(event, loginBodySchema.parse)
	const user = await findUserForAuthentication(body.email)

	if (!user) {
		throwInvalidCredentials()
	}

	const passwordMatches = await verifyStoredPassword(user.password, body.password)

	if (!passwordMatches) {
		throwInvalidCredentials()
	}

	if (!isUserPasswordHash(user.password) || userPasswordNeedsRehash(user.password)) {
		await updateUserPasswordHash(user.id, await hashUserPassword(body.password))
	}

	await setUserSession(event, {
		user: {
			id: user.id,
			name: user.name,
			email: user.email
		},
		loggedInAt: new Date().toISOString()
	})

	return {
		user: serializeUser(user)
	}
})

async function verifyStoredPassword(storedPassword: string, plainPassword: string): Promise<boolean> {
	if (!isUserPasswordHash(storedPassword)) {
		return storedPassword === plainPassword
	}

	return verifyUserPasswordHash(storedPassword, plainPassword)
}

function throwInvalidCredentials(): never {
	throw createError({
		statusCode: 401,
		statusMessage: 'Unauthorized',
		message: 'Invalid email or password.'
	})
}
