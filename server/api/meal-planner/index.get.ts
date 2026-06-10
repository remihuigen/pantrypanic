import { defineCachedApiHandler, getAuthenticatedUserId } from '#server/utils/api-core'
import { getMealPlanner } from '#server/domains'

export default defineCachedApiHandler(async (event) => {
	const userId = await getAuthenticatedUserId(event)

	return getMealPlanner(userId)
}, { name: 'meal-planner-index' })
