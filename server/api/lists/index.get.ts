import { defineCachedApiHandler, parseApiQuery } from '#server/utils/api-core'
import { listQuerySchema, listShoppingLists } from '#server/domains'

export default defineCachedApiHandler((event) => {
	const query = parseApiQuery(event, listQuerySchema)

	return listShoppingLists(query.status)
}, { name: 'lists-index' })
