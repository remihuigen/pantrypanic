import { defineApiHandler } from '#server/utils/api-core'
import { destroyCurrentHousehold, getHouseholdContext } from '#server/utils/domains/households'
import { destroyHousehold } from '#shared/utils/abilities'

export default defineApiHandler(async (event) => {
	const { householdId, userId } = await getHouseholdContext(event, {
		authorize: destroyHousehold
	})

	return destroyCurrentHousehold(event, householdId, userId)
})
