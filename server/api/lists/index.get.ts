import { defineApiHandler, parseApiQuery } from '#server/utils/api-core'
import { getHouseholdContext } from '#server/utils/households'
import { listQuerySchema, listShoppingLists } from '#server/domains'

export default defineApiHandler(async (event) => {
	const { householdId } = await getHouseholdContext(event)
	const query = parseApiQuery(event, listQuerySchema)

	return listShoppingLists(householdId, query.status)
})
