import { defineApiHandler, parseApiBody, throwApiError } from '#server/utils/api-core'
import { consumeAccessLink } from '#server/utils/households'
import { accessTokenBodySchema } from '#server/utils/settings'
import { eq } from 'drizzle-orm'
import { db, schema } from 'hub:db'

export default defineApiHandler(async (event) => {
	const body = await parseApiBody(event, accessTokenBodySchema)
	const link = await consumeAccessLink(body.token, 'reset')

	if (!link.userId) {
		throwApiError({
			code: 'NOT_FOUND',
			statusCode: 404,
			message: 'Resetlink is ongeldig.'
		})
	}

	const [user] = await db
		.select()
		.from(schema.users)
		.where(eq(schema.users.id, link.userId))
		.limit(1)

	if (!user) {
		throwApiError({
			code: 'NOT_FOUND',
			statusCode: 404,
			message: 'Gebruiker niet gevonden.'
		})
	}

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
