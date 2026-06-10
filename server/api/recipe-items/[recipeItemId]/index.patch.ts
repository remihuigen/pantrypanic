import { defineApiHandler, getAuthenticatedUserId, parseApiBody, parseApiParams } from '#server/utils/api-core'
import { recipeItemParamsSchema, updateOccurrenceBodySchema, updateRecipeItem } from '#server/domains'

export default defineApiHandler(async (event) => {
	const userId = await getAuthenticatedUserId(event)
	const { recipeItemId } = parseApiParams(event, recipeItemParamsSchema, ['recipeItemId'])
	const body = await parseApiBody(event, updateOccurrenceBodySchema)

	return updateRecipeItem(recipeItemId, body, userId)
})
