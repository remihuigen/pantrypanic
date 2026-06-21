import { defineApiHandler, parseApiQuery } from '#server/utils/api-core'
import { categoryListQuerySchema, listItemCategories } from '#server/utils/domains/categories'
import { getHouseholdContext } from '#server/utils/domains/households'

export default defineApiHandler(async (event) => {
	const { householdId } = await getHouseholdContext(event)
	const query = parseApiQuery(event, categoryListQuerySchema)

	return listItemCategories(householdId, query)
})
