import { defineApiHandler, parseApiParams } from '#server/utils/api-core'
import { getHouseholdContext } from '#server/utils/households'
import { deleteMealPlannerDayItem, mealPlannerDayItemParamsSchema } from '#server/domains'

export default defineApiHandler(async (event) => {
	const { householdId } = await getHouseholdContext(event)
	const { mealPlannerDayItemId } = parseApiParams(event, mealPlannerDayItemParamsSchema, ['mealPlannerDayItemId'])

	return deleteMealPlannerDayItem(householdId, mealPlannerDayItemId)
})
