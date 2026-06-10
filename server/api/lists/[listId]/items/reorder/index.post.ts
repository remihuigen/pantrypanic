import { defineApiHandler, getAuthenticatedUserId, parseApiBody, parseApiParams } from '#server/utils/api-core'
import { listParamsSchema, reorderBodySchema, reorderListItems } from '#server/domains'

export default defineApiHandler(async (event) => {
	const userId = await getAuthenticatedUserId(event)
	const { listId } = parseApiParams(event, listParamsSchema, ['listId'])
	const body = await parseApiBody(event, reorderBodySchema)

	return reorderListItems(listId, body.orderedIds, userId)
})
