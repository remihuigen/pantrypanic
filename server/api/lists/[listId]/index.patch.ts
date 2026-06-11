import { defineApiHandler, parseApiBody, parseApiParams } from '#server/utils/api-core'
import { getHouseholdContext } from '#server/utils/households'
import { listParamsSchema, updateListBodySchema, updateShoppingList } from '#server/domains'

export default defineApiHandler(async (event) => {
	const { householdId, userId } = await getHouseholdContext(event)
	const { listId } = parseApiParams(event, listParamsSchema, ['listId'])
	const body = await parseApiBody(event, updateListBodySchema)

	return updateShoppingList(householdId, listId, body, userId)
})
