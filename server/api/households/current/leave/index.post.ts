import { defineApiHandler } from '#server/utils/api-core'
import { getHouseholdContext, leaveHousehold } from '#server/utils/domains/households'

export default defineApiHandler(async (event) => {
	const { householdId, userId } = await getHouseholdContext(event)

	return leaveHousehold(event, householdId, userId)
})
