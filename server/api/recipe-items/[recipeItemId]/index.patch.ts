import {
	recipeItemParamsSchema,
	updateOccurrenceBodySchema,
	updateRecipeItem
} from '#server/domains'
import { defineApiHandler, parseApiBody, parseApiParams } from '#server/utils/api-core'
import { getHouseholdContext } from '#server/utils/domains/households'

export default defineApiHandler(async (event) => {
	const { householdId, userId } = await getHouseholdContext(event)
	const { recipeItemId } = parseApiParams(event, recipeItemParamsSchema, ['recipeItemId'])
	const body = await parseApiBody(event, updateOccurrenceBodySchema)

	return updateRecipeItem(householdId, recipeItemId, body, userId)
})
