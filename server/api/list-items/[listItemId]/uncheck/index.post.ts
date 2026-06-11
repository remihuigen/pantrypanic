import { defineApiHandler, parseApiParams } from '#server/utils/api-core'
import { getHouseholdContext } from '#server/utils/households'
import { listItemParamsSchema, uncheckListItem } from '#server/domains'

export default defineApiHandler(async (event) => {
	const { householdId, userId } = await getHouseholdContext(event)
	const { listItemId } = parseApiParams(event, listItemParamsSchema, ['listItemId'])

	return uncheckListItem(householdId, listItemId, userId)
})
