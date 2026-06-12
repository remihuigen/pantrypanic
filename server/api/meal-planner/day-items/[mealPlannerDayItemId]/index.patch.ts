import {
	mealPlannerDayItemParamsSchema,
	updateMealPlannerDayItem,
	updateOccurrenceBodySchema
} from '#server/domains'
import { defineApiHandler, parseApiBody, parseApiParams } from '#server/utils/api-core'
import { getHouseholdContext } from '#server/utils/domains/households'

export default defineApiHandler(async (event) => {
	const { householdId, userId } = await getHouseholdContext(event)
	const { mealPlannerDayItemId } = parseApiParams(event, mealPlannerDayItemParamsSchema, [
		'mealPlannerDayItemId'
	])
	const body = await parseApiBody(event, updateOccurrenceBodySchema)

	return updateMealPlannerDayItem(householdId, mealPlannerDayItemId, body, userId)
})
