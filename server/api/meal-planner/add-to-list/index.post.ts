import { defineApiHandler, getAuthenticatedUserId, parseApiBody } from '#server/utils/api-core'
import { addMealPlannerToList, addRecipeToListBodySchema } from '#server/domains'

export default defineApiHandler(async (event) => {
	const userId = await getAuthenticatedUserId(event)
	const body = await parseApiBody(event, addRecipeToListBodySchema)

	return addMealPlannerToList(body.listId, userId)
})
