import { getMealPlanner } from '#server/domains'
import { defineApiHandler } from '#server/utils/api-core'
import { getHouseholdContext } from '#server/utils/domains/households'

export default defineApiHandler(async (event) => {
	const { householdId, userId } = await getHouseholdContext(event)

	return getMealPlanner(householdId, userId)
})
