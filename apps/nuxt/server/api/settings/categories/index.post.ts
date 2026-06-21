import { createCategoryBodySchema } from '#server/domains'
import { defineApiHandler, parseApiBody } from '#server/utils/api-core'
import { createItemCategory } from '#server/utils/domains/categories'
import { getHouseholdContext } from '#server/utils/domains/households'

export default defineApiHandler(async (event) => {
	const { householdId, userId } = await getHouseholdContext(event)
	const body = await parseApiBody(event, createCategoryBodySchema)

	return createItemCategory(householdId, body, userId)
})
