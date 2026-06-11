import { defineApiHandler } from '#server/utils/api-core'
import { getHouseholdContext } from '#server/utils/households'
import { clearHouseholdData } from '#server/utils/settings'

export default defineApiHandler(async (event) => {
	const { householdId, userId } = await getHouseholdContext(event)

	return clearHouseholdData(householdId, userId)
})
