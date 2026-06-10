import { defineCachedApiHandler, parseApiParams } from '#server/utils/api-core'
import { getShoppingList, listParamsSchema } from '#server/domains'

export default defineCachedApiHandler((event) => {
	const { listId } = parseApiParams(event, listParamsSchema, ['listId'])

	return getShoppingList(listId)
}, { name: 'lists-detail' })
