import { defineApiHandler, getAuthenticatedUserId, parseApiBody } from '#server/utils/api-core'
import { createRecipe, createRecipeBodySchema } from '#server/domains'

export default defineApiHandler(async (event) => {
	const userId = await getAuthenticatedUserId(event)
	const body = await parseApiBody(event, createRecipeBodySchema)

	return createRecipe(body, userId)
})
