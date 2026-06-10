import { defineApiHandler, getAuthenticatedUserId, parseApiParams } from '#server/utils/api-core'
import { checkListItem, listItemParamsSchema } from '#server/domains'

export default defineApiHandler(async (event) => {
	const userId = await getAuthenticatedUserId(event)
	const { listItemId } = parseApiParams(event, listItemParamsSchema, ['listItemId'])

	return checkListItem(listItemId, userId)
})
