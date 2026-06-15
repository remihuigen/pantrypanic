import { updateCategoryBodySchema } from '#server/domains'
import {
	defineApiHandler,
	domainIdSchema,
	parseApiBody,
	parseApiParams
} from '#server/utils/api-core'
import { updateItemCategory } from '#server/utils/domains/categories'
import { getHouseholdContext } from '#server/utils/domains/households'
import { z } from 'zod'

const categoryParamsSchema = z.strictObject({ categoryId: domainIdSchema })

export default defineApiHandler(async (event) => {
	const { householdId, userId } = await getHouseholdContext(event)
	const { categoryId } = parseApiParams(event, categoryParamsSchema, ['categoryId'])
	const body = await parseApiBody(event, updateCategoryBodySchema)

	return updateItemCategory(householdId, categoryId, body, userId)
})
