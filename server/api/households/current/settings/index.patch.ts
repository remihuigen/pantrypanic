import { defineApiHandler, parseApiBody } from '#server/utils/api-core'
import { getHouseholdContext, updateHouseholdSettings } from '#server/utils/households'
import { householdSettingsBodySchema, serializeSettings } from '#server/utils/settings'

export default defineApiHandler(async (event) => {
	const { householdId, userId } = await getHouseholdContext(event)
	const body = await parseApiBody(event, householdSettingsBodySchema)
	const settings = await updateHouseholdSettings(householdId, userId, body)

	return { settings: serializeSettings(settings) }
})
