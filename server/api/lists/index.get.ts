import { defineApiHandler, parseApiQuery } from '#server/utils/api-core'
import { listQuerySchema, listShoppingLists } from '#server/domains'

export default defineApiHandler((event) => {
	const query = parseApiQuery(event, listQuerySchema)

	return listShoppingLists(query.status)
})
