import { defineCachedApiHandler, parseApiQuery } from '#server/utils/api-core'
import { createItemSuggestionsQuerySchema, suggestItems } from '#server/domains'

export default defineCachedApiHandler((event) => {
	const query = parseApiQuery(event, createItemSuggestionsQuerySchema(event))

	return suggestItems(query)
}, { name: 'items-suggestions' })
