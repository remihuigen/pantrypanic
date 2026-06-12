import { defineApiHandler, parseApiParams } from '#server/utils/api-core'
import { assignHouseholdOwner, getHouseholdContext } from '#server/utils/households'
import { userIdParamsSchema } from '#server/utils/settings'
import { manageHousehold } from '#shared/utils/abilities'

export default defineApiHandler(async (event) => {
	const { householdId } = await getHouseholdContext(event, { authorize: manageHousehold })
	const { userId } = parseApiParams(event, userIdParamsSchema, ['userId'])

	return assignHouseholdOwner(householdId, userId)
})
