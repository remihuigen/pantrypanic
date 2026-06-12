import {
	addMealPlannerDayItem,
	createOccurrenceBodySchema,
	mealPlannerDayParamsSchema
} from '#server/domains'
import { defineApiHandler, parseApiBody, parseApiParams } from '#server/utils/api-core'
import { getHouseholdContext } from '#server/utils/domains/households'

export default defineApiHandler(async (event) => {
	const { householdId, userId } = await getHouseholdContext(event)
	const { dayOfWeek } = parseApiParams(event, mealPlannerDayParamsSchema, ['dayOfWeek'])
	const body = await parseApiBody(event, createOccurrenceBodySchema)

	return addMealPlannerDayItem(householdId, dayOfWeek, body, userId)
})
