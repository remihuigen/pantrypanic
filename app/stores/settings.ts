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
	createdAt: number
}

type Member = {
	id: number
	name: string
	email: string
	avatarPathname?: string
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
	category?: string
	notes?: string
	updatedAt: number
	usageCount: number
}

type Stats = {
	totals: {
		lists: number
		items: number
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
	const members = ref<Member[]>([])
	const householdSettings = ref<HouseholdSettings | null>(null)
	const items = ref<SettingsItem[]>([])
	const stats = ref<Stats | null>(null)
	const inviteUrl = ref<string | null>(null)
	const resetUrl = ref<string | null>(null)
	const isLoading = ref(false)
	const isSaving = ref(false)
	const error = ref<AppError | null>(null)
	const uploadProfileAvatar = useUpload('/api/profile/avatar', { formKey: 'avatar' }) as unknown as (
		_files: File[]
	) => Promise<AvatarUploadResponse>

	const activeHousehold = computed(
		() => households.value.find((household) => household.id === activeHouseholdId.value) ?? null
	)

	function setError(err: unknown) {
		const appError = normalizeAppError(err)
		error.value = appError
		return appError
	}

	async function fetchAll() {
		isLoading.value = true
		error.value = null

		try {
			await Promise.all([
				fetchProfile(),
				fetchHouseholds(),
				fetchMembers(),
				fetchSettings(),
				fetchItems(),
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

	async function updateProfile(input: Partial<Pick<Profile, 'name' | 'email' | 'avatarPathname'>> & { password?: string }) {
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
		const data = await uploadProfileAvatar([file])
		profile.value = data.user
		return data
	}

	async function fetchHouseholds() {
		const data = await apiFetch<{
			households: Household[]
			activeHouseholdId: string
			enableMultiTenancy: boolean
		}>('/api/households')
		households.value = data.households
		activeHouseholdId.value = data.activeHouseholdId
		enableMultiTenancy.value = data.enableMultiTenancy
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

	async function fetchMembers() {
		const data = await apiFetch<{ members: Member[] }>('/api/households/current/members')
		members.value = data.members
		return data.members
	}

	async function removeMember(userId: number) {
		await apiFetch(`/api/households/current/members/${userId}`, { method: 'DELETE' })
		members.value = members.value.filter((member) => member.id !== userId)
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
		input: Partial<Omit<SettingsItem, 'defaultUnit' | 'category' | 'notes'>> & {
			defaultUnit?: string | null
			category?: string | null
			notes?: string | null
		}
	) {
		const data = await apiFetch<{ item: SettingsItem }>(`/api/settings/items/${itemId}`, {
			method: 'PATCH',
			body: input
		})
		items.value = items.value.map((item) => (item.id === itemId ? { ...item, ...data.item } : item))
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
		await apiFetch(`/api/settings/items/${itemId}`, { method: 'DELETE' })
		items.value = items.value.filter((item) => item.id !== itemId)
	}

	async function clearData() {
		await apiFetch('/api/settings/clear-data', { method: 'POST' })
		await Promise.all([fetchItems(), fetchStats()])
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
		enableMultiTenancy,
		members,
		householdSettings,
		items,
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
		fetchMembers,
		removeMember,
		createInvite,
		createResetLink,
		fetchSettings,
		updateSettings,
		fetchItems,
		updateItem,
		mergeItem,
		deleteItem,
		clearData,
		fetchStats
	}
})
