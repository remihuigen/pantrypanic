import { useSettingsStore } from '~/stores/settings'
import * as apiClient from '~/utils/api-client'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
	setStoreRefreshInterval: vi.fn(),
	useUpload: vi.fn(),
	upload: vi.fn()
}))

vi.mock('~/composables/useStoreRefresh', () => ({
	setStoreRefreshInterval: mocks.setStoreRefreshInterval
}))

describe('useSettingsStore', () => {
	beforeEach(() => {
		setActivePinia(createPinia())
		vi.restoreAllMocks()
		mocks.setStoreRefreshInterval.mockClear()
		mocks.useUpload.mockReset()
		mocks.upload.mockReset()
		mocks.useUpload.mockReturnValue(mocks.upload)
		vi.stubGlobal('useUpload', mocks.useUpload)
		vi.spyOn(apiClient, 'normalizeAppError').mockImplementation((error) => error as never)
	})

	it('fetches all settings sections and applies the household refresh interval', async () => {
		const store = useSettingsStore()
		vi.spyOn(apiClient, 'apiFetch').mockImplementation(async (url) => {
			switch (url) {
				case '/api/profile':
					return { user: profile() }
				case '/api/households':
					return {
						households: [household()],
						activeHouseholdId: 'home',
						enableMultiTenancy: true
					}
				case '/api/households/current/members':
					return { members: [member()] }
				case '/api/households/current/settings':
					return { settings: householdSettings({ refreshIntervalMs: 15000 }) }
				case '/api/settings/items':
					return { items: [settingsItem()] }
				case '/api/settings/stats':
					return { stats: stats() }
				default:
					throw new Error(`Unexpected URL: ${String(url)}`)
			}
		})

		await store.fetchAll()

		expect(store.profile?.email).toBe('remi@example.com')
		expect(store.activeHouseholdId).toBe('home')
		expect(store.activeHousehold?.name).toBe('Thuis')
		expect(store.enableMultiTenancy).toBe(true)
		expect(store.members).toHaveLength(1)
		expect(store.items).toHaveLength(1)
		expect(store.stats?.totals.listItems).toBe(12)
		expect(store.isLoading).toBe(false)
		expect(mocks.setStoreRefreshInterval).toHaveBeenCalledWith(15000)
	})

	it('stores normalized fetch-all errors and clears loading state', async () => {
		const store = useSettingsStore()
		const error = { code: 'NETWORK', message: 'Offline.' }
		vi.spyOn(apiClient, 'apiFetch').mockRejectedValue(error)

		await expect(store.fetchAll()).rejects.toEqual(error)

		expect(store.error).toEqual(error)
		expect(store.isLoading).toBe(false)
	})

	it('loads profile and clears household-scoped state when no household is active', async () => {
		const store = useSettingsStore()
		store.members = [member()]
		store.items = [settingsItem()]
		store.stats = stats()
		vi.spyOn(apiClient, 'apiFetch').mockImplementation(async (url) => {
			switch (url) {
				case '/api/profile':
					return { user: profile() }
				case '/api/households':
					return {
						households: [],
						activeHouseholdId: null,
						enableMultiTenancy: true
					}
				default:
					throw new Error(`Unexpected URL: ${String(url)}`)
			}
		})

		await store.fetchAll()

		expect(store.profile?.id).toBe(1)
		expect(store.activeHouseholdId).toBeNull()
		expect(store.members).toEqual([])
		expect(store.items).toEqual([])
		expect(store.stats).toBeNull()
	})

	it('updates profile fields and exposes save errors', async () => {
		const store = useSettingsStore()
		vi.spyOn(apiClient, 'apiFetch').mockResolvedValueOnce({
			user: profile({ name: 'Nieuw', email: 'nieuw@example.com' })
		})

		await expect(
			store.updateProfile({ name: 'Nieuw', email: 'nieuw@example.com', password: 'secret123' })
		).resolves.toMatchObject({ name: 'Nieuw' })

		expect(apiClient.apiFetch).toHaveBeenCalledWith('/api/profile', {
			method: 'PATCH',
			body: { name: 'Nieuw', email: 'nieuw@example.com', password: 'secret123' }
		})
		expect(store.profile?.email).toBe('nieuw@example.com')
		expect(store.isSaving).toBe(false)

		const error = { code: 'CONFLICT', message: 'Email bestaat al.' }
		vi.mocked(apiClient.apiFetch).mockRejectedValueOnce(error)
		await expect(store.updateProfile({ email: 'taken@example.com' })).rejects.toEqual(error)
		expect(store.error).toEqual(error)
		expect(store.isSaving).toBe(false)
	})

	it('uploads an avatar through NuxtHub upload and stores the returned profile', async () => {
		const store = useSettingsStore()
		const file = new File(['image'], 'avatar.png', { type: 'image/png' })
		mocks.upload.mockResolvedValueOnce({
			success: true,
			data: {
				user: profile({ avatarPathname: 'avatars/avatar.png' }),
				avatarPathname: 'avatars/avatar.png'
			}
		})

		await expect(store.uploadAvatar(file)).resolves.toMatchObject({
			avatarPathname: 'avatars/avatar.png'
		})

		expect(mocks.useUpload).toHaveBeenCalledWith('/api/profile/avatar', { formKey: 'avatar' })
		expect(mocks.upload).toHaveBeenCalledWith([file])
		expect(store.profile?.avatarPathname).toBe('avatars/avatar.png')
	})

	it('refreshes the profile after avatar upload when the upload helper returns file metadata only', async () => {
		const store = useSettingsStore()
		const file = new File(['image'], 'avatar.png', { type: 'image/png' })
		mocks.upload.mockResolvedValueOnce([{ pathname: 'avatars/uploaded.png' }])
		vi.spyOn(apiClient, 'apiFetch').mockResolvedValueOnce({
			user: profile({ avatarPathname: 'avatars/uploaded.png' })
		})

		await expect(store.uploadAvatar(file)).resolves.toMatchObject({
			avatarPathname: 'avatars/uploaded.png'
		})

		expect(apiClient.apiFetch).toHaveBeenCalledWith('/api/profile')
		expect(store.profile?.avatarPathname).toBe('avatars/uploaded.png')
	})

	it('switches household and refreshes every settings section', async () => {
		const store = useSettingsStore()
		const calls: string[] = []
		vi.spyOn(apiClient, 'apiFetch').mockImplementation(async (url) => {
			calls.push(String(url))
			switch (url) {
				case '/api/households/switch':
					return { activeHouseholdId: 'work' }
				case '/api/profile':
					return { user: profile() }
				case '/api/households':
					return {
						households: [household({ id: 'work', name: 'Werk' })],
						activeHouseholdId: 'work',
						enableMultiTenancy: true
					}
				case '/api/households/current/members':
					return { members: [member()] }
				case '/api/households/current/settings':
					return { settings: householdSettings() }
				case '/api/settings/items':
					return { items: [] }
				case '/api/settings/stats':
					return { stats: stats() }
				default:
					throw new Error(`Unexpected URL: ${String(url)}`)
			}
		})

		await store.switchHousehold('work')

		expect(apiClient.apiFetch).toHaveBeenNthCalledWith(1, '/api/households/switch', {
			method: 'POST',
			body: { householdId: 'work' }
		})
		expect(calls).toContain('/api/profile')
		expect(store.activeHouseholdId).toBe('work')
		expect(store.activeHousehold?.name).toBe('Werk')
	})

	it('manages household members and one-time links', async () => {
		const store = useSettingsStore()
		store.members = [member({ id: 1 }), member({ id: 2 })]
		vi.spyOn(apiClient, 'apiFetch')
			.mockResolvedValueOnce({})
			.mockResolvedValueOnce({ invite: { url: '/onboarding/invite-token', expiresAt: 10 } })
			.mockResolvedValueOnce({ resetLink: { url: '/access/reset-token', expiresAt: 20 } })

		await store.removeMember(2)
		const invite = await store.createInvite()
		const resetLink = await store.createResetLink(1)

		expect(apiClient.apiFetch).toHaveBeenNthCalledWith(1, '/api/households/current/members/2', {
			method: 'DELETE'
		})
		expect(store.members.map((item) => item.id)).toEqual([1])
		expect(invite.url).toBe('/onboarding/invite-token')
		expect(resetLink.url).toBe('/access/reset-token')
		expect(store.inviteUrl).toBe('/onboarding/invite-token')
		expect(store.resetUrl).toBe('/access/reset-token')
	})

	it('assigns household owners and updates local role state', async () => {
		const store = useSettingsStore()
		store.profile = profile({ id: 1 })
		store.activeHouseholdId = 'home'
		store.households = [household({ id: 'home', role: 'member' }), household({ id: 'other', role: 'member' })]
		store.members = [member({ id: 1, role: 'member' }), member({ id: 2, role: 'member' })]
		vi.spyOn(apiClient, 'apiFetch').mockResolvedValueOnce({
			userId: 2,
			role: 'householdOwner'
		})

		await store.assignOwner(2)

		expect(apiClient.apiFetch).toHaveBeenCalledWith('/api/households/current/members/2/owner', {
			method: 'POST'
		})
		expect(store.members.find((item) => item.id === 2)?.role).toBe('householdOwner')
		expect(store.activeHousehold?.role).toBe('householdOwner')
		expect(store.households.find((item) => item.id === 'other')?.role).toBe('member')
	})

	it('falls back to active household role when the profile is not in member state', () => {
		const store = useSettingsStore()
		store.profile = profile({ id: 99 })
		store.activeHouseholdId = 'home'
		store.households = [household({ id: 'home', role: 'householdOwner' })]
		store.members = [member({ id: 1, role: 'member' })]

		expect(store.currentMemberRole).toBe('householdOwner')
		expect(store.isHouseholdOwner).toBe(true)
	})

	it('clears household-scoped state after leaving or destroying a household', async () => {
		const store = useSettingsStore()
		store.activeHouseholdId = 'home'
		store.households = [household()]
		store.members = [member()]
		store.items = [settingsItem()]
		store.stats = stats()
		vi.spyOn(apiClient, 'apiFetch')
			.mockResolvedValueOnce({ leftHouseholdId: 'home', destroyedHousehold: false })
			.mockResolvedValueOnce({
				households: [household({ id: 'next' })],
				activeHouseholdId: 'next',
				enableMultiTenancy: true
			})
			.mockResolvedValueOnce({ destroyedHouseholdId: 'next' })
			.mockResolvedValueOnce({
				households: [],
				activeHouseholdId: null,
				enableMultiTenancy: true
			})

		await expect(store.leaveHousehold()).resolves.toEqual({
			leftHouseholdId: 'home',
			destroyedHousehold: false
		})
		expect(store.activeHouseholdId).toBe('next')
		expect(store.members).toEqual([])
		expect(store.items).toEqual([])
		expect(store.stats).toBeNull()

		await expect(store.destroyHousehold()).resolves.toEqual({ destroyedHouseholdId: 'next' })
		expect(store.activeHouseholdId).toBeNull()
		expect(store.households).toEqual([])
	})

	it('clears household state when reloading households fails after leaving', async () => {
		const store = useSettingsStore()
		store.activeHouseholdId = 'home'
		store.households = [household()]
		store.members = [member()]
		vi.spyOn(apiClient, 'apiFetch')
			.mockResolvedValueOnce({ leftHouseholdId: 'home', destroyedHousehold: true })
			.mockRejectedValueOnce({ code: 'FORBIDDEN', message: 'Geen huishouden.' })

		await store.leaveHousehold()

		expect(store.activeHouseholdId).toBeNull()
		expect(store.households).toEqual([])
		expect(store.members).toEqual([])
	})

	it('clears all local state after deleting the current account', async () => {
		const store = useSettingsStore()
		store.profile = profile({ id: 1 })
		store.activeHouseholdId = 'home'
		store.households = [household()]
		store.members = [member()]
		store.items = [settingsItem()]
		store.stats = stats()
		vi.spyOn(apiClient, 'apiFetch').mockResolvedValueOnce({ deletedUserId: 1 })

		await expect(store.deleteAccount()).resolves.toEqual({ deletedUserId: 1 })

		expect(apiClient.apiFetch).toHaveBeenCalledWith('/api/profile', { method: 'DELETE' })
		expect(store.profile).toBeNull()
		expect(store.activeHouseholdId).toBeNull()
		expect(store.households).toEqual([])
		expect(store.members).toEqual([])
	})

	it('updates household settings and refresh interval state', async () => {
		const store = useSettingsStore()
		vi.spyOn(apiClient, 'apiFetch').mockResolvedValueOnce({
			settings: householdSettings({ refreshIntervalMs: 30000 })
		})

		await store.updateSettings({ refreshIntervalMs: 30000 })

		expect(apiClient.apiFetch).toHaveBeenCalledWith('/api/households/current/settings', {
			method: 'PATCH',
			body: { refreshIntervalMs: 30000 }
		})
		expect(store.householdSettings?.refreshIntervalMs).toBe(30000)
		expect(mocks.setStoreRefreshInterval).toHaveBeenCalledWith(30000)
	})

	it('fetches, edits, merges, and deletes canonical items', async () => {
		const store = useSettingsStore()
		store.items = [settingsItem({ id: 'milk' }), settingsItem({ id: 'bread', name: 'Bread' })]
		vi.spyOn(apiClient, 'apiFetch')
			.mockResolvedValueOnce({ items: [settingsItem({ id: 'milk', name: 'Melk' })] })
			.mockResolvedValueOnce({
				item: settingsItem({ id: 'milk', name: 'Halfvolle melk', defaultUnit: 'pak' })
			})
			.mockResolvedValueOnce({})
			.mockResolvedValueOnce({ stats: stats({ listItems: 4 }) })
			.mockResolvedValueOnce({})
			.mockResolvedValueOnce({ stats: stats({ listItems: 0 }) })

		await store.fetchItems('melk')
		await store.updateItem('milk', { name: 'Halfvolle melk', defaultUnit: 'pak' })
		await store.mergeItem('bread', 'milk')
		await store.deleteItem('milk')

		expect(apiClient.apiFetch).toHaveBeenNthCalledWith(1, '/api/settings/items?q=melk')
		expect(apiClient.apiFetch).toHaveBeenNthCalledWith(2, '/api/settings/items/milk', {
			method: 'PATCH',
			body: { name: 'Halfvolle melk', defaultUnit: 'pak' }
		})
		expect(apiClient.apiFetch).toHaveBeenNthCalledWith(3, '/api/settings/items/bread/merge', {
			method: 'POST',
			body: { targetItemId: 'milk' }
		})
		expect(apiClient.apiFetch).toHaveBeenNthCalledWith(5, '/api/settings/items/milk', {
			method: 'DELETE'
		})
		expect(apiClient.apiFetch).toHaveBeenNthCalledWith(6, '/api/settings/stats')
		expect(store.items).toEqual([])
		expect(store.stats?.totals.listItems).toBe(0)
	})

	it('updates one canonical item while preserving other local items', async () => {
		const store = useSettingsStore()
		store.items = [settingsItem({ id: 'milk' }), settingsItem({ id: 'bread', name: 'Bread' })]
		vi.spyOn(apiClient, 'apiFetch').mockResolvedValueOnce({
			item: settingsItem({ id: 'milk', name: 'Halfvolle melk' })
		})

		await store.updateItem('milk', { name: 'Halfvolle melk' })

		expect(store.items.map((item) => item.name)).toEqual(['Halfvolle melk', 'Bread'])
	})

	it('clears household data and reloads items and stats', async () => {
		const store = useSettingsStore()
		store.items = [settingsItem()]
		vi.spyOn(apiClient, 'apiFetch')
			.mockResolvedValueOnce({})
			.mockResolvedValueOnce({ items: [] })
			.mockResolvedValueOnce({ stats: stats({ listItems: 0 }) })

		await store.clearData()

		expect(apiClient.apiFetch).toHaveBeenNthCalledWith(1, '/api/settings/clear-data', {
			method: 'POST'
		})
		expect(store.items).toEqual([])
		expect(store.stats?.totals.listItems).toBe(0)
	})
})

function profile(
	overrides: Partial<{
		id: number
		name: string
		email: string
		avatarPathname?: string
		createdAt: string
	}> = {}
) {
	return {
		id: 1,
		name: 'Remi',
		email: 'remi@example.com',
		createdAt: '2026-01-01T00:00:00.000Z',
		...overrides
	}
}

function household(
	overrides: Partial<{
		id: string
		name: string
		role: 'member' | 'householdOwner'
		createdAt: number
	}> = {}
) {
	return {
		id: 'home',
		name: 'Thuis',
		role: 'householdOwner' as const,
		createdAt: 1,
		...overrides
	}
}

function member(
	overrides: Partial<{
		id: number
		name: string
		email: string
		avatarPathname?: string
		role: 'member' | 'householdOwner'
		createdAt: number
	}> = {}
) {
	return {
		id: 1,
		name: 'Remi',
		email: 'remi@example.com',
		role: 'householdOwner' as const,
		createdAt: 1,
		...overrides
	}
}

function householdSettings(overrides: Partial<{ refreshIntervalMs: number; updatedAt: number }> = {}) {
	return {
		refreshIntervalMs: 5000,
		updatedAt: 1,
		...overrides
	}
}

function settingsItem(
	overrides: Partial<{
		id: string
		name: string
		normalizedName: string
		defaultUnit?: string
		updatedAt: number
		usageCount: number
		activeListItemUsageCount: number
	}> = {}
) {
	return {
		id: 'milk',
		name: 'Milk',
		normalizedName: 'milk',
		updatedAt: 1,
		usageCount: 0,
		activeListItemUsageCount: 0,
		...overrides
	}
}

function stats(overrides: Partial<{ lists: number; items: number; recipes: number; listItems: number }> = {}) {
	return {
		totals: {
			lists: 2,
			items: 3,
			recipes: 4,
			listItems: overrides.listItems ?? 12
		},
		mostUsedItems: [{ itemId: 'milk', name: 'Milk', count: 3 }],
		favoriteRecipesByDay: [{ dayOfWeek: 1, recipeId: 'pasta', name: 'Pasta' }]
	}
}
