import { defineApiHandler, parseApiParams } from '#server/utils/api-core'
import { deleteMealPlannerDayItem, mealPlannerDayItemParamsSchema } from '#server/domains'

export default defineApiHandler((event) => {
	const { mealPlannerDayItemId } = parseApiParams(event, mealPlannerDayItemParamsSchema, ['mealPlannerDayItemId'])

	return deleteMealPlannerDayItem(mealPlannerDayItemId)
})
