import { defineApiHandler, parseApiBody } from '#server/utils/api-core'
import { switchHousehold } from '#server/utils/domains/households'
import { householdSwitchBodySchema } from '#server/utils/settings'

export default defineApiHandler(async (event) => {
	const body = await parseApiBody(event, householdSwitchBodySchema)

	return switchHousehold(event, body.householdId)
})
