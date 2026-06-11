import { defineApiHandler, parseApiQuery } from '#server/utils/api-core'
import { listRecipes, recipeQuerySchema } from '#server/domains'

export default defineApiHandler((event) => {
	const query = parseApiQuery(event, recipeQuerySchema)

	return listRecipes(query)
})
