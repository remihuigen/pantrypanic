import { listQuerySchema, listShoppingLists } from '#server/domains'
import { defineApiHandler, parseApiQuery } from '#server/utils/api-core'
import { getHouseholdContext } from '#server/utils/domains/households'

export default defineApiHandler(async (event) => {
	const { householdId } = await getHouseholdContext(event)
	const query = parseApiQuery(event, listQuerySchema)

	return listShoppingLists(householdId, query.status)
})
