import { defineApiHandler } from '#server/utils/api-core'
import { getHouseholdContext } from '#server/utils/households'
import { getMealPlanner } from '#server/domains'

export default defineApiHandler(async (event) => {
	const { householdId, userId } = await getHouseholdContext(event)

	return getMealPlanner(householdId, userId)
})
