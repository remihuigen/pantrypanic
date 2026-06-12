import { defineApiHandler, parseApiBody, parseApiParams } from '#server/utils/api-core'
import { getHouseholdContext } from '#server/utils/domains/households'
import { itemParamsSchema, itemUpdateBodySchema, updateCanonicalItem } from '#server/utils/settings'

export default defineApiHandler(async (event) => {
	const { householdId, userId } = await getHouseholdContext(event)
	const { itemId } = parseApiParams(event, itemParamsSchema, ['itemId'])
	const body = await parseApiBody(event, itemUpdateBodySchema)

	return updateCanonicalItem(householdId, itemId, body, userId)
})
