import { defineApiHandler } from '#server/utils/api-core'
import { createAccessLink, getHouseholdContext } from '#server/utils/domains/households'
import { manageHousehold } from '#shared/utils/abilities'
import { getRequestURL } from 'h3'

export default defineApiHandler(async (event) => {
	const { householdId, userId } = await getHouseholdContext(event, { authorize: manageHousehold })

	const { token, link } = await createAccessLink({
		type: 'invite',
		householdId,
		createdByUserId: userId
	})
	const origin = getRequestURL(event).origin

	return {
		invite: {
			id: link.id,
			expiresAt: link.expiresAt,
			url: `${origin}/join?token=${encodeURIComponent(token)}`
		}
	}
})
