import { defineApiHandler, parseApiParams } from '#server/utils/api-core'
import { getHouseholdContext } from '#server/utils/households'
import { archiveRecipe, recipeParamsSchema } from '#server/domains'

export default defineApiHandler(async (event) => {
	const { householdId, userId } = await getHouseholdContext(event)
	const { recipeId } = parseApiParams(event, recipeParamsSchema, ['recipeId'])

	return archiveRecipe(householdId, recipeId, userId)
})
