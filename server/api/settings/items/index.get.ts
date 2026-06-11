import { defineApiHandler, parseApiQuery } from '#server/utils/api-core'
import { getHouseholdContext } from '#server/utils/households'
import { itemListQuerySchema, listAllItems } from '#server/utils/settings'

export default defineApiHandler(async (event) => {
	const { householdId } = await getHouseholdContext(event)
	const query = parseApiQuery(event, itemListQuerySchema)

	return listAllItems(householdId, query)
})
