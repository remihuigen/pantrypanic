import { defineApiHandler, parseApiParams } from '#server/utils/api-core'
import { getHouseholdContext } from '#server/utils/households'
import { deleteRecipeItem, recipeItemParamsSchema } from '#server/domains'

export default defineApiHandler(async (event) => {
	const { householdId } = await getHouseholdContext(event)
	const { recipeItemId } = parseApiParams(event, recipeItemParamsSchema, ['recipeItemId'])

	return deleteRecipeItem(householdId, recipeItemId)
})
