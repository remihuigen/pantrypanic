import { defineApiHandler, getAuthenticatedUserId, parseApiBody, parseApiParams } from '#server/utils/api-core'
import { addMealPlannerDayItem, createOccurrenceBodySchema, mealPlannerDayParamsSchema } from '#server/domains'

export default defineApiHandler(async (event) => {
	const userId = await getAuthenticatedUserId(event)
	const { dayOfWeek } = parseApiParams(event, mealPlannerDayParamsSchema, ['dayOfWeek'])
	const body = await parseApiBody(event, createOccurrenceBodySchema)

	return addMealPlannerDayItem(dayOfWeek, body, userId)
})
