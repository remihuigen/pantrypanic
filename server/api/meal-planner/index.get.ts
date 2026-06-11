import { defineApiHandler, getAuthenticatedUserId } from '#server/utils/api-core'
import { getMealPlanner } from '#server/domains'

export default defineApiHandler(async (event) => {
	const userId = await getAuthenticatedUserId(event)

	return getMealPlanner(userId)
})
