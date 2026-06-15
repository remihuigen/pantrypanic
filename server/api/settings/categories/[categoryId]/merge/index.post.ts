import { mergeCategoryBodySchema } from '#server/domains'
import {
	defineApiHandler,
	domainIdSchema,
	parseApiBody,
	parseApiParams
} from '#server/utils/api-core'
import { mergeItemCategory } from '#server/utils/domains/categories'
import { getHouseholdContext } from '#server/utils/domains/households'
import { z } from 'zod'

const categoryParamsSchema = z.strictObject({ categoryId: domainIdSchema })

export default defineApiHandler(async (event) => {
	const { householdId } = await getHouseholdContext(event)
	const { categoryId } = parseApiParams(event, categoryParamsSchema, ['categoryId'])
	const body = await parseApiBody(event, mergeCategoryBodySchema)

	return mergeItemCategory(householdId, categoryId, body)
})
