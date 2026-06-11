import { defineApiHandler, getAuthenticatedUserId } from '#server/utils/api-core'
import { getHouseholdContext, listUserHouseholds } from '#server/utils/households'

export default defineApiHandler(async (event) => {
	const userId = await getAuthenticatedUserId(event)
	const context = await getHouseholdContext(event)
	const households = await listUserHouseholds(userId)

	return {
		households,
		activeHouseholdId: context.householdId,
		enableMultiTenancy: context.isMultiTenancyEnabled
	}
})
