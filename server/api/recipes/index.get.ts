import { defineCachedApiHandler, parseApiQuery } from '#server/utils/api-core'
import { listRecipes, recipeQuerySchema } from '#server/domains'

export default defineCachedApiHandler((event) => {
	const query = parseApiQuery(event, recipeQuerySchema)

	return listRecipes(query)
}, { name: 'recipes-index' })
