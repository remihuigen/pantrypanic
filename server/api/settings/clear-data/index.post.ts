import { defineApiHandler } from '#server/utils/api-core'
import { getHouseholdContext } from '#server/utils/domains/households'
import { clearHouseholdData } from '#server/utils/settings'
import { clearHouseholdAppData } from '#shared/utils/abilities'

export default defineApiHandler(async (event) => {
	const { householdId, userId } = await getHouseholdContext(event, {
		authorize: clearHouseholdAppData
	})

	return clearHouseholdData(householdId, userId)
})
