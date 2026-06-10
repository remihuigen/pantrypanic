import { defineApiHandler, getAuthenticatedUserId, parseApiBody, parseApiParams } from '#server/utils/api-core'
import { mealPlannerDayParamsSchema, reorderBodySchema, reorderMealPlannerDayItems } from '#server/domains'

export default defineApiHandler(async (event) => {
	const userId = await getAuthenticatedUserId(event)
	const { dayOfWeek } = parseApiParams(event, mealPlannerDayParamsSchema, ['dayOfWeek'])
	const body = await parseApiBody(event, reorderBodySchema)

	return reorderMealPlannerDayItems(dayOfWeek, body.orderedIds, userId)
})
