import { defineApiHandler, getAuthenticatedUserId, parseApiBody } from '#server/utils/api-core'
import { createListBodySchema, createShoppingList } from '#server/domains'

export default defineApiHandler(async (event) => {
	const userId = await getAuthenticatedUserId(event)
	const body = await parseApiBody(event, createListBodySchema)

	return createShoppingList(body, userId)
})
