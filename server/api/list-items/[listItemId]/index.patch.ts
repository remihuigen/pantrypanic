import { listItemParamsSchema, updateListItem, updateListItemBodySchema } from '#server/domains'
import {
	defineApiHandler,
	parseApiBody,
	parseApiParams
} from '#server/utils/api-core'
import { getHouseholdContext } from '#server/utils/households'

export default defineApiHandler(async (event) => {
	const { householdId, userId } = await getHouseholdContext(event)
	const { listItemId } = parseApiParams(event, listItemParamsSchema, ['listItemId'])
	const body = await parseApiBody(event, updateListItemBodySchema)

	return updateListItem(householdId, listItemId, body, userId)
})
