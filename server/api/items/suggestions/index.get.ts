import { defineApiHandler, parseApiQuery } from '#server/utils/api-core'
import { createItemSuggestionsQuerySchema, suggestItems } from '#server/domains'

export default defineApiHandler((event) => {
	const query = parseApiQuery(event, createItemSuggestionsQuerySchema(event))

	return suggestItems(query)
})
