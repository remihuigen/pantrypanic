import { defineApiHandler, parseApiParams } from '#server/utils/api-core'
import { getHouseholdContext, removeHouseholdMember } from '#server/utils/households'
import { userIdParamsSchema } from '#server/utils/settings'

export default defineApiHandler(async (event) => {
	const { householdId } = await getHouseholdContext(event)
	const { userId } = parseApiParams(event, userIdParamsSchema, ['userId'])

	return removeHouseholdMember(householdId, userId)
})
