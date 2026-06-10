import { defineCachedApiHandler, parseApiParams } from '#server/utils/api-core'
import { getRecipe, recipeParamsSchema } from '#server/domains'

export default defineCachedApiHandler((event) => {
	const { recipeId } = parseApiParams(event, recipeParamsSchema, ['recipeId'])

	return getRecipe(recipeId)
}, { name: 'recipes-detail' })
