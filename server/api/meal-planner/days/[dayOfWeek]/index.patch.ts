import { defineApiHandler, getAuthenticatedUserId, parseApiBody, parseApiParams } from '#server/utils/api-core'
import { mealPlannerDayBodySchema, mealPlannerDayParamsSchema, updateMealPlannerDay } from '#server/domains'

export default defineApiHandler(async (event) => {
	const userId = await getAuthenticatedUserId(event)
	const { dayOfWeek } = parseApiParams(event, mealPlannerDayParamsSchema, ['dayOfWeek'])
	const body = await parseApiBody(event, mealPlannerDayBodySchema)

	return updateMealPlannerDay(dayOfWeek, body, userId)
})
