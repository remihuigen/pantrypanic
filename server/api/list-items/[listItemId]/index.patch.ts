import { defineApiHandler, getAuthenticatedUserId, parseApiBody, parseApiParams } from '#server/utils/api-core'
import { listItemParamsSchema, updateListItem, updateOccurrenceBodySchema } from '#server/domains'

export default defineApiHandler(async (event) => {
	const userId = await getAuthenticatedUserId(event)
	const { listItemId } = parseApiParams(event, listItemParamsSchema, ['listItemId'])
	const body = await parseApiBody(event, updateOccurrenceBodySchema)

	return updateListItem(listItemId, body, userId)
})
