import { defineApiHandler, getAuthenticatedUserId, parseApiParams } from '#server/utils/api-core'
import { deleteRecipe, recipeParamsSchema } from '#server/domains'

export default defineApiHandler(async (event) => {
	const userId = await getAuthenticatedUserId(event)
	const { recipeId } = parseApiParams(event, recipeParamsSchema, ['recipeId'])

	return deleteRecipe(recipeId, userId)
})
