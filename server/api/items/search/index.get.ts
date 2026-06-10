import { defineCachedApiHandler, parseApiQuery } from '#server/utils/api-core'
import { createItemSearchQuerySchema, searchItems } from '#server/domains'

export default defineCachedApiHandler((event) => {
	const query = parseApiQuery(event, createItemSearchQuerySchema(event))

	return searchItems(query)
}, { name: 'items-search' })
