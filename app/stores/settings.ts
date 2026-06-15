import type { AppError } from '~~/shared/types/api'

import { setStoreRefreshInterval } from '~/composables/useStoreRefresh'
import { apiFetch, normalizeAppError } from '~/utils/api-client'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

type Profile = {
	id: number
	name: string
	email: string
	avatarPathname?: string
	createdAt: string | Date
}

type Household = {
	id: string
	name: string
	role: HouseholdRole
	createdAt: number
}

type HouseholdRole = 'member' | 'householdOwner'

type Member = {
	id: number
	name: string
	email: string
	avatarPathname?: string
	role: HouseholdRole
	createdAt: number
}

type HouseholdSettings = {
	refreshIntervalMs: number
	updatedAt: number
}

type SettingsItem = {
	id: string
	name: string
	normalizedName: string
	defaultUnit?: string
	categoryId?: string
	categoryName?: string
	updatedAt: number
	usageCount: number
	activeListItemUsageCount: number
}

type SettingsCategory = {
	id: string
	name: string
	updatedAt?: number
	usageCount?: number
	itemUsageCount?: number
	listItemUsageCount?: number
}

type Stats = {
	totals: {
		lists: number
		items: number
		categories: number
		recipes: number
		listItems: number
	}
	mostUsedItems: Array<{ itemId: string; name: string; count: number }>
	favoriteRecipesByDay: Array<{ dayOfWeek: number; recipeId: string; name: string }>
}

type AvatarUploadResponse = {
	user: Profile
	avatarPathname: string
}

export const useSettingsStore = defineStore('settings', () => {
	const profile = ref<Profile | null>(null)
	const households = ref<Household[]>([])
	const activeHouseholdId = ref<string | null>(null)
	const enableMultiTenancy = ref(false)
	const enableHouseholdCreation = ref(false)
	const members = ref<Member[]>([])
	const householdSettings = ref<HouseholdSettings | null>(null)
	const items = ref<SettingsItem[]>([])
	const categories = ref<SettingsCategory[]>([])
	const stats = ref<Stats | null>(null)
	const inviteUrl = ref<string | null>(null)
	const resetUrl = ref<string | null>(null)
	const isLoading = ref(false)
	const isSaving = ref(false)
	const error = ref<AppError | null>(null)
	const uploadProfileAvatar = useUpload('/api/profile/avatar', {
		formKey: 'avatar'
	}) as unknown as (_files: File[]) => Promise<unknown>

	const activeHousehold = computed(
		() => households.value.find((household) => household.id === activeHouseholdId.value) ?? null
	)
	const currentMemberRole = computed(
		() =>
			members.value.find((member) => member.id === profile.value?.id)?.role ??
			activeHousehold.value?.role ??
			null
	)
	const isHouseholdOwner = computed(() => currentMemberRole.value === 'householdOwner')
	const ownerMembers = computed(() =>
		members.value.filter((member) => member.role === 'householdOwner')
	)
	const otherOwnerMembers = computed(() =>
		ownerMembers.value.filter((member) => member.id !== profile.value?.id)
	)
	const isOnlyHouseholdOwner = computed(
		() => isHouseholdOwner.value && ownerMembers.value.length === 1
	)
	const hasNoHousehold = computed(() => Boolean(profile.value && !activeHouseholdId.value))

	function setError(err: unknown) {
		const appError = normalizeAppError(err)
		error.value = appError
		return appError
	}

	async function fetchAll() {
		isLoading.value = true
		error.value = null

		try {
			await Promise.all([fetchProfile(), fetchHouseholds()])

			if (!activeHouseholdId.value) {
				members.value = []
				householdSettings.value = null
				items.value = []
				categories.value = []
				stats.value = null
				return
			}

			await Promise.all([
				fetchMembers(),
				fetchSettings(),
				fetchItems(),
				fetchCategories(),
				fetchStats()
			])
		} catch (err) {
			throw setError(err)
		} finally {
			isLoading.value = false
		}
	}

	async function fetchProfile() {
		const data = await apiFetch<{ user: Profile }>('/api/profile')
		profile.value = data.user
		return data.user
	}

	async function updateProfile(
		input: Partial<Pick<Profile, 'name' | 'email' | 'avatarPathname'>> & { password?: string }
	) {
		isSaving.value = true
		error.value = null

		try {
			const data = await apiFetch<{ user: Profile }>('/api/profile', {
				method: 'PATCH',
				body: input
			})
			profile.value = data.user
			return data.user
		} catch (err) {
			throw setError(err)
		} finally {
			isSaving.value = false
		}
	}

	async function uploadAvatar(file: File) {
		const response = await uploadProfileAvatar([file])
		const data = normalizeAvatarUploadResponse(response)

		if (data) {
			profile.value = data.user
			return data
		}

		const user = await fetchProfile()

		return {
			user,
			avatarPathname: user.avatarPathname ?? ''
		}
	}

	async function fetchHouseholds() {
		const data = await apiFetch<{
			households: Household[]
			activeHouseholdId: string | null
			enableMultiTenancy: boolean
			enableHouseholdCreation: boolean
		}>('/api/households')
		households.value = data.households
		activeHouseholdId.value = data.activeHouseholdId
		enableMultiTenancy.value = data.enableMultiTenancy
		enableHouseholdCreation.value = data.enableHouseholdCreation
		return data
	}

	async function switchHousehold(householdId: string) {
		await apiFetch<{ activeHouseholdId: string }>('/api/households/switch', {
			method: 'POST',
			body: { householdId }
		})
		activeHouseholdId.value = householdId
		await fetchAll()
	}

	async function createHousehold(input: { name: string }) {
		const data = await apiFetch<{
			household: Household
			activeHouseholdId: string
		}>('/api/households', {
			method: 'POST',
			body: input
		})

		households.value = [
			...households.value.filter((household) => household.id !== data.household.id),
			data.household
		]
		activeHouseholdId.value = data.activeHouseholdId
		await fetchAll()
		return data
	}

	async function fetchMembers() {
		const data = await apiFetch<{ members: Member[] }>('/api/households/current/members')
		members.value = data.members
		return data.members
	}

	async function removeMember(userId: number) {
		await apiFetch(`/api/households/current/members/${userId}`, { method: 'DELETE' })
		members.value = members.value.filter((member) => member.id !== userId)
	}

	async function assignOwner(userId: number) {
		const data = await apiFetch<{ userId: number; role: HouseholdRole }>(
			`/api/households/current/members/${userId}/owner`,
			{ method: 'POST' }
		)
		members.value = members.value.map((member) =>
			member.id === userId ? { ...member, role: data.role } : member
		)
		households.value = households.value.map((household) =>
			household.id === activeHouseholdId.value
				? { ...household, role: 'householdOwner' }
				: household
		)
		return data
	}

	async function createInvite() {
		const data = await apiFetch<{ invite: { url: string; expiresAt: number } }>(
			'/api/households/current/invites',
			{ method: 'POST' }
		)
		inviteUrl.value = data.invite.url
		return data.invite
	}

	async function createResetLink(userId: number) {
		const data = await apiFetch<{ resetLink: { url: string; expiresAt: number } }>(
			`/api/households/current/members/${userId}/reset-link`,
			{ method: 'POST' }
		)
		resetUrl.value = data.resetLink.url
		return data.resetLink
	}

	async function fetchSettings() {
		const data = await apiFetch<{ settings: HouseholdSettings }>(
			'/api/households/current/settings'
		)
		householdSettings.value = data.settings
		setStoreRefreshInterval(data.settings.refreshIntervalMs)
		return data.settings
	}

	async function updateSettings(input: { refreshIntervalMs: number }) {
		const data = await apiFetch<{ settings: HouseholdSettings }>(
			'/api/households/current/settings',
			{ method: 'PATCH', body: input }
		)
		householdSettings.value = data.settings
		setStoreRefreshInterval(data.settings.refreshIntervalMs)
		return data.settings
	}

	async function fetchItems(q?: string) {
		const params = new URLSearchParams()
		if (q) params.set('q', q)
		const data = await apiFetch<{ items: SettingsItem[] }>(
			`/api/settings/items${params.toString() ? `?${params.toString()}` : ''}`
		)
		items.value = data.items
		return data.items
	}

	async function updateItem(
		itemId: string,
		input: Partial<Omit<SettingsItem, 'defaultUnit' | 'categoryId'>> & {
			defaultUnit?: string | null
			categoryId?: string | null
		}
	) {
		const data = await apiFetch<{ item: SettingsItem }>(`/api/settings/items/${itemId}`, {
			method: 'PATCH',
			body: input
		})
		items.value = items.value.map((item) =>
			item.id === itemId ? { ...item, ...data.item } : item
		)
		return data.item
	}

	async function mergeItem(itemId: string, targetItemId: string) {
		await apiFetch(`/api/settings/items/${itemId}/merge`, {
			method: 'POST',
			body: { targetItemId }
		})
		items.value = items.value.filter((item) => item.id !== itemId)
		await fetchStats()
	}

	async function deleteItem(itemId: string) {
		const data = await apiFetch<{
			deletedItemId: string
			deletedListItems: number
			deletedRecipeItems: number
			deletedMealPlannerDayItems: number
		}>(`/api/settings/items/${itemId}`, { method: 'DELETE' })
		items.value = items.value.filter((item) => item.id !== itemId)
		await fetchStats()
		return data
	}

	async function fetchCategories(q?: string) {
		const params = new URLSearchParams()
		if (q) params.set('q', q)
		const data = await apiFetch<{ categories: SettingsCategory[] }>(
			`/api/settings/categories${params.toString() ? `?${params.toString()}` : ''}`
		)
		categories.value = data.categories.map(normalizeSettingsCategory)
		return categories.value
	}

	async function createCategory(input: { name: string }) {
		const data = await apiFetch<{ category: SettingsCategory }>('/api/settings/categories', {
			method: 'POST',
			body: input
		})
		categories.value = [...categories.value, normalizeSettingsCategory(data.category)].sort(
			(left, right) => left.name.localeCompare(right.name, 'nl-NL')
		)
		await fetchStats()
		return data.category
	}

	async function updateCategory(categoryId: string, input: { name?: string }) {
		const data = await apiFetch<{ category: SettingsCategory }>(
			`/api/settings/categories/${categoryId}`,
			{
				method: 'PATCH',
				body: input
			}
		)
		categories.value = categories.value.map((category) =>
			category.id === categoryId
				? { ...category, ...normalizeSettingsCategory(data.category) }
				: category
		)
		items.value = items.value.map((item) =>
			item.categoryId === categoryId ? { ...item, categoryName: data.category.name } : item
		)
		return data.category
	}

	async function mergeCategory(categoryId: string, targetCategoryId: string) {
		await apiFetch(`/api/settings/categories/${categoryId}/merge`, {
			method: 'POST',
			body: { targetCategoryId }
		})
		const targetName = categories.value.find(
			(category) => category.id === targetCategoryId
		)?.name
		categories.value = categories.value.filter((category) => category.id !== categoryId)
		items.value = items.value.map((item) =>
			item.categoryId === categoryId
				? { ...item, categoryId: targetCategoryId, categoryName: targetName }
				: item
		)
		await fetchStats()
	}

	async function deleteCategory(categoryId: string) {
		const data = await apiFetch<{ deletedCategoryId: string }>(
			`/api/settings/categories/${categoryId}`,
			{ method: 'DELETE' }
		)
		categories.value = categories.value.filter((category) => category.id !== categoryId)
		items.value = items.value.map((item) =>
			item.categoryId === categoryId
				? { ...item, categoryId: undefined, categoryName: undefined }
				: item
		)
		await fetchStats()
		return data
	}

	async function clearData() {
		await apiFetch('/api/settings/clear-data', { method: 'POST' })
		await Promise.all([fetchItems(), fetchCategories(), fetchStats()])
	}

	async function leaveHousehold() {
		const data = await apiFetch<{ leftHouseholdId: string; destroyedHousehold: boolean }>(
			'/api/households/current/leave',
			{ method: 'POST' }
		)
		await fetchHouseholds().catch(() => {
			households.value = []
			activeHouseholdId.value = null
		})
		members.value = []
		householdSettings.value = null
		items.value = []
		categories.value = []
		stats.value = null
		return data
	}

	async function destroyHousehold() {
		const data = await apiFetch<{ destroyedHouseholdId: string }>('/api/households/current', {
			method: 'DELETE'
		})
		await fetchHouseholds().catch(() => {
			households.value = []
			activeHouseholdId.value = null
		})
		members.value = []
		householdSettings.value = null
		items.value = []
		categories.value = []
		stats.value = null
		return data
	}

	async function deleteAccount() {
		const data = await apiFetch<{ deletedUserId: number }>('/api/profile', { method: 'DELETE' })
		profile.value = null
		households.value = []
		activeHouseholdId.value = null
		members.value = []
		householdSettings.value = null
		items.value = []
		categories.value = []
		stats.value = null
		return data
	}

	async function fetchStats() {
		const data = await apiFetch<{ stats: Stats }>('/api/settings/stats')
		stats.value = data.stats
		return data.stats
	}

	return {
		profile,
		households,
		activeHouseholdId,
		activeHousehold,
		currentMemberRole,
		isHouseholdOwner,
		ownerMembers,
		otherOwnerMembers,
		isOnlyHouseholdOwner,
		hasNoHousehold,
		enableMultiTenancy,
		enableHouseholdCreation,
		members,
		householdSettings,
		items,
		categories,
		stats,
		inviteUrl,
		resetUrl,
		isLoading,
		isSaving,
		error,
		fetchAll,
		fetchProfile,
		updateProfile,
		uploadAvatar,
		fetchHouseholds,
		switchHousehold,
		createHousehold,
		fetchMembers,
		removeMember,
		assignOwner,
		createInvite,
		createResetLink,
		fetchSettings,
		updateSettings,
		fetchItems,
		updateItem,
		mergeItem,
		deleteItem,
		fetchCategories,
		createCategory,
		updateCategory,
		mergeCategory,
		deleteCategory,
		clearData,
		leaveHousehold,
		destroyHousehold,
		deleteAccount,
		fetchStats
	}
})

function normalizeAvatarUploadResponse(response: unknown): AvatarUploadResponse | null {
	if (isAvatarUploadResponse(response)) {
		return response
	}

	if (
		response &&
		typeof response === 'object' &&
		'success' in response &&
		response.success === true &&
		'data' in response &&
		isAvatarUploadResponse(response.data)
	) {
		return response.data
	}

	if (Array.isArray(response)) {
		for (const item of response) {
			const result = normalizeAvatarUploadResponse(item)

			if (result) {
				return result
			}
		}
	}

	return null
}

function isAvatarUploadResponse(value: unknown): value is AvatarUploadResponse {
	return (
		typeof value === 'object' &&
		value !== null &&
		'user' in value &&
		typeof value.user === 'object' &&
		value.user !== null &&
		'avatarPathname' in value &&
		typeof value.avatarPathname === 'string'
	)
}

function normalizeSettingsCategory(category: SettingsCategory): Required<SettingsCategory> {
	return {
		id: category.id,
		name: category.name,
		updatedAt: category.updatedAt ?? 0,
		usageCount: category.usageCount ?? 0,
		itemUsageCount: category.itemUsageCount ?? 0,
		listItemUsageCount: category.listItemUsageCount ?? 0
	}
}
