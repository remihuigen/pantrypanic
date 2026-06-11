import { defineApiHandler, parseApiParams } from '#server/utils/api-core'
import { getRecipe, recipeParamsSchema } from '#server/domains'

export default defineApiHandler((event) => {
	const { recipeId } = parseApiParams(event, recipeParamsSchema, ['recipeId'])

	return getRecipe(recipeId)
})
