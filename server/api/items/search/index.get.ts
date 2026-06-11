import { defineApiHandler, parseApiQuery } from '#server/utils/api-core'
import { getHouseholdContext } from '#server/utils/households'
import { createItemSearchQuerySchema, searchItems } from '#server/domains'

export default defineApiHandler(async (event) => {
	const { householdId } = await getHouseholdContext(event)
	const query = parseApiQuery(event, createItemSearchQuerySchema(event))

	return searchItems(householdId, query)
})
