import { getShoppingList, listParamsSchema } from '#server/domains'
import { defineApiHandler, parseApiParams } from '#server/utils/api-core'
import { getHouseholdContext } from '#server/utils/domains/households'

export default defineApiHandler(async (event) => {
	const { householdId } = await getHouseholdContext(event)
	const { listId } = parseApiParams(event, listParamsSchema, ['listId'])

	return getShoppingList(householdId, listId)
})
