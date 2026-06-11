import { defineApiHandler, parseApiBody, throwApiError } from '#server/utils/api-core'
import {
	consumeAccessLink,
	ensureHouseholdMembership
} from '#server/utils/households'
import { createUser, findUserForAuthentication } from '#server/utils/user-management'
import { inviteAcceptBodySchema } from '#server/utils/settings'

export default defineApiHandler(async (event) => {
	const body = await parseApiBody(event, inviteAcceptBodySchema)
	const link = await consumeAccessLink(body.token, 'invite')
	let user = await findUserForAuthentication(body.email)

	if (user) {
		const matches = await verifyInvitePassword(user.password, body.password)

		if (!matches) {
			throwApiError({
				code: 'UNAUTHORIZED',
				statusCode: 401,
				message: 'Wachtwoord klopt niet voor dit bestaande account.'
			})
		}
	} else {
		const created = await createUser(
			{ name: body.name, email: body.email, password: body.password },
			{ seedDefaultHousehold: false }
		)
		user = await findUserForAuthentication(created.email)
	}

	if (!user) {
		throwApiError({
			code: 'INTERNAL_ERROR',
			statusCode: 500,
			message: 'Gebruiker kon niet worden aangemaakt.'
		})
	}

	await ensureHouseholdMembership(link.householdId, user.id)
	await setUserSession(event, {
		user: {
			id: user.id,
			name: user.name,
			email: user.email,
			avatarPathname: user.avatarPathname ?? undefined
		},
		loggedInAt: new Date().toISOString(),
		activeHouseholdId: link.householdId
	})

	return { activeHouseholdId: link.householdId }
})

async function verifyInvitePassword(storedPassword: string, plainPassword: string) {
	try {
		return await verifyPassword(storedPassword, plainPassword)
	} catch {
		return storedPassword === plainPassword
	}
}
