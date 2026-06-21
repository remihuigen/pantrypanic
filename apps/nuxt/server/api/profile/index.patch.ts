import { defineApiHandler, getAuthenticatedUserId, parseApiBody } from '#server/utils/api-core'
import { profileUpdateBodySchema, updateProfile } from '#server/utils/settings'

export default defineApiHandler(async (event) => {
	const userId = await getAuthenticatedUserId(event)
	const body = await parseApiBody(event, profileUpdateBodySchema)
	const result = await updateProfile(userId, body)
	const session = await getUserSession(event)

	if (session.user) {
		await setUserSession(event, {
			user: {
				id: result.user.id,
				name: result.user.name,
				email: result.user.email,
				avatarPathname: result.user.avatarPathname
			},
			loggedInAt: session.loggedInAt,
			activeHouseholdId: session.activeHouseholdId
		})
	}

	return result
})
