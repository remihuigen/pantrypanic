import { defineApiHandler, parseApiQuery } from '#server/utils/api-core'
import { createItemSearchQuerySchema, searchItems } from '#server/domains'

export default defineApiHandler((event) => {
	const query = parseApiQuery(event, createItemSearchQuerySchema(event))

	return searchItems(query)
})
