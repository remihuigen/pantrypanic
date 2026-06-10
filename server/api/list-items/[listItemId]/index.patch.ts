import { listItemParamsSchema, updateListItem, updateListItemBodySchema } from '#server/domains'
import {
	defineApiHandler,
	getAuthenticatedUserId,
	parseApiBody,
	parseApiParams
} from '#server/utils/api-core'

export default defineApiHandler(async (event) => {
	const userId = await getAuthenticatedUserId(event)
	const { listItemId } = parseApiParams(event, listItemParamsSchema, ['listItemId'])
	const body = await parseApiBody(event, updateListItemBodySchema)

	return updateListItem(listItemId, body, userId)
})
