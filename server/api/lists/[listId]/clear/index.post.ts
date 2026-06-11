import { defineApiHandler, parseApiParams } from '#server/utils/api-core'
import { getHouseholdContext } from '#server/utils/households'
import { clearShoppingList, listParamsSchema } from '#server/domains'

export default defineApiHandler(async (event) => {
	const { householdId, userId } = await getHouseholdContext(event)
	const { listId } = parseApiParams(event, listParamsSchema, ['listId'])

	return clearShoppingList(householdId, listId, userId)
})
