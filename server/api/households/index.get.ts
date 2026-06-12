import { defineApiHandler, getAuthenticatedUserId } from '#server/utils/api-core'
import {
	getHouseholdContext,
	getMultiTenancyEnabled,
	listUserHouseholds
} from '#server/utils/domains/households'

export default defineApiHandler(async (event) => {
	const userId = await getAuthenticatedUserId(event)
	const households = await listUserHouseholds(userId)
	const isMultiTenancyEnabled = getMultiTenancyEnabled(event)

	if (isMultiTenancyEnabled && households.length === 0) {
		return {
			households,
			activeHouseholdId: null,
			enableMultiTenancy: isMultiTenancyEnabled
		}
	}

	const context = await getHouseholdContext(event)

	return {
		households,
		activeHouseholdId: context.householdId,
		enableMultiTenancy: context.isMultiTenancyEnabled
	}
})
