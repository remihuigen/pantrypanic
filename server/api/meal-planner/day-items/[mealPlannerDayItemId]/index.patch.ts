import { defineApiHandler, getAuthenticatedUserId, parseApiBody, parseApiParams } from '#server/utils/api-core'
import {
	mealPlannerDayItemParamsSchema,
	updateMealPlannerDayItem,
	updateOccurrenceBodySchema
} from '#server/domains'

export default defineApiHandler(async (event) => {
	const userId = await getAuthenticatedUserId(event)
	const { mealPlannerDayItemId } = parseApiParams(event, mealPlannerDayItemParamsSchema, ['mealPlannerDayItemId'])
	const body = await parseApiBody(event, updateOccurrenceBodySchema)

	return updateMealPlannerDayItem(mealPlannerDayItemId, body, userId)
})
