import { defineApiHandler, getAuthenticatedUserId, parseApiParams } from '#server/utils/api-core'
import { deleteShoppingList, listParamsSchema } from '#server/domains'

export default defineApiHandler(async (event) => {
	const userId = await getAuthenticatedUserId(event)
	const { listId } = parseApiParams(event, listParamsSchema, ['listId'])

	return deleteShoppingList(listId, userId)
})
