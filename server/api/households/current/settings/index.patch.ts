import { defineApiHandler, parseApiBody } from '#server/utils/api-core'
import { getHouseholdContext, updateHouseholdSettings } from '#server/utils/domains/households'
import { householdSettingsBodySchema, serializeSettings } from '#server/utils/settings'
import { manageHousehold } from '#shared/utils/abilities'

export default defineApiHandler(async (event) => {
	const { householdId, userId } = await getHouseholdContext(event, { authorize: manageHousehold })
	const body = await parseApiBody(event, householdSettingsBodySchema)

	const settings = await updateHouseholdSettings(householdId, userId, body)

	return { settings: serializeSettings(settings) }
})
