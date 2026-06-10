import { defineApiHandler, getAuthenticatedUserId, parseApiBody, parseApiParams } from '#server/utils/api-core'
import { addListItem, createOccurrenceBodySchema, listParamsSchema } from '#server/domains'

export default defineApiHandler(async (event) => {
	const userId = await getAuthenticatedUserId(event)
	const { listId } = parseApiParams(event, listParamsSchema, ['listId'])
	const body = await parseApiBody(event, createOccurrenceBodySchema)

	return addListItem(listId, body, userId)
})
