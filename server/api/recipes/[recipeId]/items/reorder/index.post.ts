import { defineApiHandler, getAuthenticatedUserId, parseApiBody, parseApiParams } from '#server/utils/api-core'
import { recipeParamsSchema, reorderBodySchema, reorderRecipeItems } from '#server/domains'

export default defineApiHandler(async (event) => {
	const userId = await getAuthenticatedUserId(event)
	const { recipeId } = parseApiParams(event, recipeParamsSchema, ['recipeId'])
	const body = await parseApiBody(event, reorderBodySchema)

	return reorderRecipeItems(recipeId, body.orderedIds, userId)
})
