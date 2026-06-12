import { resolveInitialHouseholdId } from '#server/utils/domains/households'
import {
	findUserForAuthentication,
	serializeUser,
	updateUserPasswordHash
} from '#server/utils/user-management'
import { createError, defineEventHandler, readValidatedBody } from 'h3'
import { z } from 'zod'

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

	const passwordVerification = await verifyStoredPassword(user.password, body.password)

	if (!passwordVerification.matches) {
		throwInvalidCredentials()
	}

	if (passwordVerification.needsRehash) {
		await updateUserPasswordHash(user.id, await hashPassword(body.password))
	}

	const activeHouseholdId = await resolveInitialHouseholdId(user.id, event)

	await setUserSession(event, {
		user: {
			id: user.id,
			name: user.name,
			email: user.email,
			avatarPathname: user.avatarPathname ?? undefined
		},
		loggedInAt: new Date().toISOString(),
		activeHouseholdId
	})

	return {
		user: serializeUser(user)
	}
})

async function verifyStoredPassword(
	storedPassword: string,
	plainPassword: string
): Promise<{
	matches: boolean
	needsRehash: boolean
}> {
	try {
		const matches = await verifyPassword(storedPassword, plainPassword)

		if (!matches) {
			return {
				matches: false,
				needsRehash: false
			}
		}

		return {
			matches: true,
			needsRehash: passwordNeedsReHash(storedPassword)
		}
	} catch {
		const matches = storedPassword === plainPassword

		return {
			matches,
			needsRehash: matches
		}
	}
}

function throwInvalidCredentials(): never {
	throw createError({
		statusCode: 401,
		statusMessage: 'Unauthorized',
		message: 'Invalid email or password.'
	})
}
