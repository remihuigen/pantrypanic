import { defineApiHandler, getAuthenticatedUserId, parseApiBody } from '#server/utils/api-core'
import { createHousehold } from '#server/utils/domains/households'
import { householdCreateBodySchema } from '#server/utils/settings'

export default defineApiHandler(async (event) => {
	const userId = await getAuthenticatedUserId(event)
	const body = await parseApiBody(event, householdCreateBodySchema)

	return createHousehold(event, userId, body.name)
})
