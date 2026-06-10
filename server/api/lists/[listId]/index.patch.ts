import { defineApiHandler, getAuthenticatedUserId, parseApiBody, parseApiParams } from '#server/utils/api-core'
import { listParamsSchema, updateListBodySchema, updateShoppingList } from '#server/domains'

export default defineApiHandler(async (event) => {
	const userId = await getAuthenticatedUserId(event)
	const { listId } = parseApiParams(event, listParamsSchema, ['listId'])
	const body = await parseApiBody(event, updateListBodySchema)

	return updateShoppingList(listId, body, userId)
})
