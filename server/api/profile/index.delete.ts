import { defineApiHandler, getAuthenticatedUserId } from '#server/utils/api-core'
import { deleteAccount } from '#server/utils/households'

export default defineApiHandler(async (event) => {
	const userId = await getAuthenticatedUserId(event)

	return deleteAccount(event, userId)
})
