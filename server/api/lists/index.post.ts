import { defineApiHandler, parseApiBody } from '#server/utils/api-core'
import { getHouseholdContext } from '#server/utils/households'
import { createListBodySchema, createShoppingList } from '#server/domains'

export default defineApiHandler(async (event) => {
	const { householdId, userId } = await getHouseholdContext(event)
	const body = await parseApiBody(event, createListBodySchema)

	return createShoppingList(householdId, body, userId)
})
