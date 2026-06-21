import { defineApiHandler, getAuthenticatedUserId } from '#server/utils/api-core'
import { getProfile } from '#server/utils/settings'

export default defineApiHandler(async (event) => {
	const userId = await getAuthenticatedUserId(event)

	return getProfile(userId)
})
