import { defineApiHandler, getAuthenticatedUserId, parseApiBody, parseApiParams } from '#server/utils/api-core'
import { addRecipeToList, addRecipeToListBodySchema, recipeParamsSchema } from '#server/domains'

export default defineApiHandler(async (event) => {
	const userId = await getAuthenticatedUserId(event)
	const { recipeId } = parseApiParams(event, recipeParamsSchema, ['recipeId'])
	const body = await parseApiBody(event, addRecipeToListBodySchema)

	return addRecipeToList(recipeId, body.listId, userId)
})
