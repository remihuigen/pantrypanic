import { defineApiHandler, getAuthenticatedUserId, parseApiParams } from '#server/utils/api-core'
import { listItemParamsSchema, uncheckListItem } from '#server/domains'

export default defineApiHandler(async (event) => {
	const userId = await getAuthenticatedUserId(event)
	const { listItemId } = parseApiParams(event, listItemParamsSchema, ['listItemId'])

	return uncheckListItem(listItemId, userId)
})
