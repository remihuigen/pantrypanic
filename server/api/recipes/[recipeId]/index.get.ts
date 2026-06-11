import { defineApiHandler, parseApiParams } from '#server/utils/api-core'
import { getHouseholdContext } from '#server/utils/households'
import { getRecipe, recipeParamsSchema } from '#server/domains'

export default defineApiHandler(async (event) => {
	const { householdId } = await getHouseholdContext(event)
	const { recipeId } = parseApiParams(event, recipeParamsSchema, ['recipeId'])

	return getRecipe(householdId, recipeId)
})
