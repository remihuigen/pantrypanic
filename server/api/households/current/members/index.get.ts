import { defineApiHandler } from '#server/utils/api-core'
import { getHouseholdContext, listHouseholdMembers } from '#server/utils/domains/households'

export default defineApiHandler(async (event) => {
	const { householdId } = await getHouseholdContext(event)
	const members = await listHouseholdMembers(householdId)

	return {
		members: members.map((member) => ({
			...member,
			avatarPathname: member.avatarPathname ?? undefined
		}))
	}
})
