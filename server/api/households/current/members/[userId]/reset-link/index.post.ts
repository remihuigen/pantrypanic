import { defineApiHandler, parseApiParams } from '#server/utils/api-core'
import {
	createAccessLink,
	getHouseholdContext,
	listHouseholdMembers
} from '#server/utils/households'
import { userIdParamsSchema } from '#server/utils/settings'
import { createError, getRequestURL } from 'h3'

export default defineApiHandler(async (event) => {
	const { householdId, userId: createdByUserId } = await getHouseholdContext(event)
	const { userId } = parseApiParams(event, userIdParamsSchema, ['userId'])
	const members = await listHouseholdMembers(householdId)

	if (!members.some((member) => member.id === userId)) {
		throw createError({
			statusCode: 404,
			statusMessage: 'Not Found',
			message: 'Gezinslid niet gevonden.'
		})
	}

	const { token, link } = await createAccessLink({
		type: 'reset',
		householdId,
		userId,
		createdByUserId
	})
	const origin = getRequestURL(event).origin

	return {
		resetLink: {
			id: link.id,
			userId,
			expiresAt: link.expiresAt,
			url: `${origin}/reset-access?token=${encodeURIComponent(token)}`
		}
	}
})
