import { defineApiHandler, parseApiBody, parseApiParams } from '#server/utils/api-core'
import { getHouseholdContext } from '#server/utils/households'
import { mealPlannerDayParamsSchema, reorderBodySchema, reorderMealPlannerDayItems } from '#server/domains'

export default defineApiHandler(async (event) => {
	const { householdId, userId } = await getHouseholdContext(event)
	const { dayOfWeek } = parseApiParams(event, mealPlannerDayParamsSchema, ['dayOfWeek'])
	const body = await parseApiBody(event, reorderBodySchema)

	return reorderMealPlannerDayItems(householdId, dayOfWeek, body.orderedIds, userId)
})
