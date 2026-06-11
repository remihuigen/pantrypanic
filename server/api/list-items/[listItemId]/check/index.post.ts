import { defineApiHandler, parseApiParams } from '#server/utils/api-core'
import { getHouseholdContext } from '#server/utils/households'
import { checkListItem, listItemParamsSchema } from '#server/domains'

export default defineApiHandler(async (event) => {
	const { householdId, userId } = await getHouseholdContext(event)
	const { listItemId } = parseApiParams(event, listItemParamsSchema, ['listItemId'])

	return checkListItem(householdId, listItemId, userId)
})
