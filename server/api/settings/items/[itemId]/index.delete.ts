import { defineApiHandler, parseApiParams } from '#server/utils/api-core'
import { getHouseholdContext } from '#server/utils/households'
import { deleteCanonicalItem, itemParamsSchema } from '#server/utils/settings'

export default defineApiHandler(async (event) => {
	const { householdId } = await getHouseholdContext(event)
	const { itemId } = parseApiParams(event, itemParamsSchema, ['itemId'])

	return deleteCanonicalItem(householdId, itemId)
})
