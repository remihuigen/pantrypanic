import { defineApiHandler, parseApiParams } from '#server/utils/api-core'
import { getShoppingList, listParamsSchema } from '#server/domains'

export default defineApiHandler((event) => {
	const { listId } = parseApiParams(event, listParamsSchema, ['listId'])

	return getShoppingList(listId)
})
