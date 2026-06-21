import { addRecipeToList, addRecipeToListBodySchema, recipeParamsSchema } from '#server/domains'
import { defineApiHandler, parseApiBody, parseApiParams } from '#server/utils/api-core'
import { getHouseholdContext } from '#server/utils/domains/households'

export default defineApiHandler(async (event) => {
	const { householdId, userId } = await getHouseholdContext(event)
	const { recipeId } = parseApiParams(event, recipeParamsSchema, ['recipeId'])
	const body = await parseApiBody(event, addRecipeToListBodySchema)

	return addRecipeToList(householdId, recipeId, body.listId, userId)
})
