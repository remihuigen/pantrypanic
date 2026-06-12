import { defineApiHandler, parseApiParams } from '#server/utils/api-core'
import { getHouseholdContext, removeHouseholdMember } from '#server/utils/domains/households'
import { userIdParamsSchema } from '#server/utils/settings'
import { manageHousehold } from '#shared/utils/abilities'

export default defineApiHandler(async (event) => {
	const { householdId } = await getHouseholdContext(event, { authorize: manageHousehold })
	const { userId } = parseApiParams(event, userIdParamsSchema, ['userId'])

	return removeHouseholdMember(householdId, userId)
})
