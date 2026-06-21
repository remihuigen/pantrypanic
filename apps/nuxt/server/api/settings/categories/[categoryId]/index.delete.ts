import { defineApiHandler, domainIdSchema, parseApiParams } from '#server/utils/api-core'
import { deleteItemCategory } from '#server/utils/domains/categories'
import { getHouseholdContext } from '#server/utils/domains/households'
import { z } from 'zod'

const categoryParamsSchema = z.strictObject({ categoryId: domainIdSchema })

export default defineApiHandler(async (event) => {
	const { householdId } = await getHouseholdContext(event)
	const { categoryId } = parseApiParams(event, categoryParamsSchema, ['categoryId'])

	return deleteItemCategory(householdId, categoryId)
})
