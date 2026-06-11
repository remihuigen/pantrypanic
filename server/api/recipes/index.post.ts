import { defineApiHandler, parseApiBody } from '#server/utils/api-core'
import { getHouseholdContext } from '#server/utils/households'
import { createRecipe, createRecipeBodySchema } from '#server/domains'

export default defineApiHandler(async (event) => {
	const { householdId, userId } = await getHouseholdContext(event)
	const body = await parseApiBody(event, createRecipeBodySchema)

	return createRecipe(householdId, body, userId)
})
