import { defineApiHandler } from '#server/utils/api-core'
import { getHouseholdContext } from '#server/utils/households'
import { getHouseholdStats } from '#server/utils/settings'

export default defineApiHandler(async (event) => {
	const { householdId } = await getHouseholdContext(event)

	return getHouseholdStats(householdId)
})
