import { defineApiHandler } from '#server/utils/api-core'
import { ensureHouseholdSettings, getHouseholdContext } from '#server/utils/domains/households'
import { serializeSettings } from '#server/utils/settings'

export default defineApiHandler(async (event) => {
	const { householdId, userId } = await getHouseholdContext(event)
	const settings = await ensureHouseholdSettings(householdId, userId)

	return { settings: serializeSettings(settings) }
})
