import { defineApiHandler, parseApiParams } from '#server/utils/api-core'
import { deleteRecipeItem, recipeItemParamsSchema } from '#server/domains'

export default defineApiHandler((event) => {
	const { recipeItemId } = parseApiParams(event, recipeItemParamsSchema, ['recipeItemId'])

	return deleteRecipeItem(recipeItemId)
})
