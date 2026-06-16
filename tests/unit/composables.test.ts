import { useConfirmDialog } from '~/composables/useConfirmDialog'
import { useFormState } from '~/composables/useFormState'
import { useIcon } from '~/composables/useIcon'
import { useRecipeUsage } from '~/composables/useRecipeUsage'
import { orchestrateRefresh } from '~/composables/useStoreRefresh'
import * as apiClient from '~/utils/api-client'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, reactive, shallowRef } from 'vue'

const mocks = vi.hoisted(() => ({
	create: vi.fn()
}))

type RecipeUsageCountsByUser = Record<string, Record<string, number>>

vi.mock('~/components/overlays/Confirmation.vue', () => ({
	default: {}
}))

describe('small composables', () => {
	beforeEach(() => {
		setActivePinia(createPinia())
		vi.restoreAllMocks()
		mocks.create.mockReset()
		vi.stubGlobal('useOverlay', () => ({
			create: mocks.create
		}))
		vi.stubGlobal('useUpload', () => vi.fn())
		vi.spyOn(apiClient, 'normalizeAppError').mockImplementation((error) => error as never)
	})

	afterEach(() => {
		vi.unstubAllGlobals()
	})

	it('resolves configured icon names by key', () => {
		const { getIcon } = useIcon()

		expect(getIcon('list')).toBe('lucide-list')
		expect(getIcon('settings')).toBe('lucide-settings')
		expect(getIcon('download')).toBe('lucide:download')
	})

	it('opens confirmation dialogs and coerces modal results to booleans', async () => {
		const open = vi.fn().mockResolvedValueOnce('confirm').mockResolvedValueOnce(undefined)
		mocks.create.mockReturnValue({ open })
		const confirm = useConfirmDialog()

		await expect(confirm({ title: 'Verwijderen?', color: 'error' })).resolves.toBe(true)
		await expect(confirm({ title: 'Annuleren?' })).resolves.toBe(false)

		expect(mocks.create).toHaveBeenNthCalledWith(
			1,
			expect.anything(),
			expect.objectContaining({
				destroyOnClose: true,
				props: { title: 'Verwijderen?', color: 'error' }
			})
		)
	})

	it('tracks dirty state by comparing normalized form values', () => {
		const initial = shallowRef({ name: 'Milk', unit: 'liter' })
		const current = reactive({ name: ' Milk ', unit: 'liter' })
		const formState = useFormState(initial, current, {
			normalize: (value) => ({
				name: value.name.trim(),
				unit: value.unit.trim() || null
			})
		})

		expect(formState.isDirty.value).toBe(false)

		current.unit = 'pak'

		expect(formState.isDirty.value).toBe(true)

		formState.resetInitialValue()

		expect(formState.isDirty.value).toBe(false)
	})

	it('orchestrates list overview refresh for the lists route', async () => {
		vi.spyOn(apiClient, 'apiFetch')
			.mockResolvedValueOnce({ lists: [] })
			.mockResolvedValueOnce({ items: [] })

		await orchestrateRefresh(route('/app/lists'))

		expect(apiClient.apiFetch).toHaveBeenNthCalledWith(1, '/api/lists?status=active')
		expect(apiClient.apiFetch).toHaveBeenNthCalledWith(2, '/api/items/suggestions')
	})

	it('orchestrates list detail refresh with list items for list detail routes', async () => {
		vi.spyOn(apiClient, 'apiFetch').mockResolvedValueOnce({
			list: {
				id: 'list-1',
				name: 'Boodschappen',
				status: 'active',
				position: 0,
				createdAt: 1,
				updatedAt: 1,
				items: []
			}
		})

		await orchestrateRefresh(route('/app/lists/list-1', { id: 'list-1' }))

		expect(apiClient.apiFetch).toHaveBeenCalledWith('/api/lists/list-1')
	})

	it('orchestrates route-specific recipe and planner refreshes', async () => {
		vi.spyOn(apiClient, 'apiFetch')
			.mockResolvedValueOnce({ recipes: [] })
			.mockResolvedValueOnce({
				recipe: {
					id: 'recipe-1',
					name: 'Pasta',
					status: 'active',
					items: [],
					createdAt: 1,
					updatedAt: 1
				}
			})
			.mockResolvedValueOnce({ days: [] })

		await orchestrateRefresh(route('/app/recipes'))
		await orchestrateRefresh(route('/app/recipes/recipe-1', { id: 'recipe-1' }))
		await orchestrateRefresh(route('/app/meal-planner'))

		expect(apiClient.apiFetch).toHaveBeenNthCalledWith(1, '/api/recipes?status=active')
		expect(apiClient.apiFetch).toHaveBeenNthCalledWith(2, '/api/recipes/recipe-1')
		expect(apiClient.apiFetch).toHaveBeenNthCalledWith(3, '/api/meal-planner')
	})

	it('orchestrates item-vault and category settings refreshes', async () => {
		vi.spyOn(apiClient, 'apiFetch')
			.mockResolvedValueOnce({
				households: [{ id: 'household-1', name: 'Thuis', role: 'householdOwner', createdAt: 1 }],
				activeHouseholdId: 'household-1',
				enableMultiTenancy: false,
				enableHouseholdCreation: false
			})
			.mockResolvedValueOnce({ items: [] })
			.mockResolvedValueOnce({ categories: [] })
			.mockResolvedValueOnce({
				households: [{ id: 'household-1', name: 'Thuis', role: 'householdOwner', createdAt: 1 }],
				activeHouseholdId: 'household-1',
				enableMultiTenancy: false,
				enableHouseholdCreation: false
			})
			.mockResolvedValueOnce({ categories: [] })

		await orchestrateRefresh(route('/app/settings/item-vault'))
		await orchestrateRefresh(route('/app/settings/categories'))

		expect(apiClient.apiFetch).toHaveBeenNthCalledWith(1, '/api/households')
		expect(apiClient.apiFetch).toHaveBeenNthCalledWith(2, '/api/settings/items')
		expect(apiClient.apiFetch).toHaveBeenNthCalledWith(3, '/api/settings/categories')
		expect(apiClient.apiFetch).toHaveBeenNthCalledWith(4, '/api/households')
		expect(apiClient.apiFetch).toHaveBeenNthCalledWith(5, '/api/settings/categories')
	})

	it('tracks recipe usage counts per user in local storage', () => {
		const profile = shallowRef<{ id: number } | null>({ id: 1 })
		const storage = shallowRef<RecipeUsageCountsByUser>({
			1: { 'recipe-known': 2 },
			anonymous: { 'recipe-public': 1 }
		})
		vi.stubGlobal('computed', computed)
		vi.stubGlobal('useSettingsStore', () => ({
			get profile() {
				return profile.value
			}
		}))
		vi.stubGlobal('useLocalStorage', vi.fn(() => storage))

		const usage = useRecipeUsage()

		expect(usage.getUsageCount('recipe-known')).toBe(2)
		expect(usage.getUsageCount('missing')).toBe(0)

		usage.incrementUsage('recipe-known')
		usage.incrementUsage('recipe-new')

		expect(storage.value[1]).toEqual({
			'recipe-known': 3,
			'recipe-new': 1
		})

		profile.value = null

		expect(usage.getUsageCount('recipe-public')).toBe(1)

		usage.incrementUsage('recipe-public')

		expect(storage.value.anonymous).toEqual({ 'recipe-public': 2 })
	})
})

function route(path: string, params: Record<string, string> = {}) {
	return { path, params }
}
