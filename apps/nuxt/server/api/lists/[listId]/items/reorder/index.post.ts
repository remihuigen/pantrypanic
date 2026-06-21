import {
	categorizedReorderBodySchema,
	listParamsSchema,
	reorderBodySchema,
	reorderCategorizedListItems,
	reorderListItems
} from '#server/domains'
import { defineApiHandler, parseApiBody, parseApiParams } from '#server/utils/api-core'
import { getHouseholdContext } from '#server/utils/domains/households'
import { z } from 'zod'

const listItemReorderBodySchema = z.union([reorderBodySchema, categorizedReorderBodySchema])

export default defineApiHandler(async (event) => {
	const { householdId, userId } = await getHouseholdContext(event)
	const { listId } = parseApiParams(event, listParamsSchema, ['listId'])
	const body = await parseApiBody(event, listItemReorderBodySchema)

	if ('groups' in body) {
		return reorderCategorizedListItems(householdId, listId, body.groups, userId)
	}

	return reorderListItems(householdId, listId, body.orderedIds, userId)
})
