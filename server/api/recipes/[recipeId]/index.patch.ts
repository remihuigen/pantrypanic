import { defineApiHandler, getAuthenticatedUserId, parseApiBody, parseApiParams } from '#server/utils/api-core'
import { recipeParamsSchema, updateRecipe, updateRecipeBodySchema } from '#server/domains'

export default defineApiHandler(async (event) => {
	const userId = await getAuthenticatedUserId(event)
	const { recipeId } = parseApiParams(event, recipeParamsSchema, ['recipeId'])
	const body = await parseApiBody(event, updateRecipeBodySchema)

	return updateRecipe(recipeId, body, userId)
})
