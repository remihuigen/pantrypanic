import { defineApiHandler, parseApiParams } from '#server/utils/api-core'
import { getHouseholdContext } from '#server/utils/households'
import { deleteRecipe, recipeParamsSchema } from '#server/domains'

export default defineApiHandler(async (event) => {
	const { householdId, userId } = await getHouseholdContext(event)
	const { recipeId } = parseApiParams(event, recipeParamsSchema, ['recipeId'])

	return deleteRecipe(householdId, recipeId, userId)
})
