import { defineApiHandler, parseApiBody, parseApiParams } from '#server/utils/api-core'
import { getHouseholdContext } from '#server/utils/domains/households'
import { itemMergeBodySchema, itemParamsSchema, mergeCanonicalItem } from '#server/utils/settings'

export default defineApiHandler(async (event) => {
	const { householdId } = await getHouseholdContext(event)
	const { itemId } = parseApiParams(event, itemParamsSchema, ['itemId'])
	const body = await parseApiBody(event, itemMergeBodySchema)

	return mergeCanonicalItem(householdId, itemId, body.targetItemId)
})
