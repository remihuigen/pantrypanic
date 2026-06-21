export type HouseholdAbilityRole = 'member' | 'householdOwner'
type AbilityUser = { id: number } | null

export const manageHousehold = defineAbility((_user: AbilityUser, role: HouseholdAbilityRole | null | undefined) => {
	return role === 'householdOwner'
})

export const destroyHousehold = defineAbility((_user: AbilityUser, role: HouseholdAbilityRole | null | undefined) => {
	return role === 'householdOwner'
})

export const clearHouseholdAppData = defineAbility(
	(_user: AbilityUser, role: HouseholdAbilityRole | null | undefined) => {
		return role === 'householdOwner'
	}
)
