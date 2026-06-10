import { defineApiHandler, getAuthenticatedUserId, parseApiBody, parseApiParams } from '#server/utils/api-core'
import { addRecipeItem, createOccurrenceBodySchema, recipeParamsSchema } from '#server/domains'

export default defineApiHandler(async (event) => {
	const userId = await getAuthenticatedUserId(event)
	const { recipeId } = parseApiParams(event, recipeParamsSchema, ['recipeId'])
	const body = await parseApiBody(event, createOccurrenceBodySchema)

	return addRecipeItem(recipeId, body, userId)
})
