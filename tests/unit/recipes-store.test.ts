import * as refreshComposable from '~/composables/useStoreRefresh'
import { useRecipesStore } from '~/stores/recipes'
import * as apiClient from '~/utils/api-client'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

type RefreshController = {
	isRunning: boolean
	isRefreshing: boolean
	start: ReturnType<typeof vi.fn>
	stop: ReturnType<typeof vi.fn>
	refreshNow: ReturnType<typeof vi.fn>
}

let refreshControllers: RefreshController[] = []

describe('useRecipesStore', () => {
	beforeEach(() => {
		setActivePinia(createPinia())
		vi.restoreAllMocks()
		refreshControllers = []
		mockRefreshComposable()
		vi.spyOn(apiClient, 'normalizeAppError').mockImplementation((error) => error as never)
	})

	it('derives active, archived, and recipe item collections from ids', () => {
		const store = useRecipesStore()
		store.recipesById['recipe-1'] = createRecipeSummary({ id: 'recipe-1', name: 'Actief' })
		store.recipesById['recipe-2'] = createRecipeSummary({
			id: 'recipe-2',
			name: 'Archief',
			status: 'archived'
		})
		store.activeRecipeIds = ['missing', 'recipe-1']
		store.archivedRecipeIds = ['recipe-2']
		store.recipeItemsById['ri-1'] = createRecipeItem({ id: 'ri-1', recipeId: 'recipe-1' })
		store.recipeItemIdsByRecipeId['recipe-1'] = ['missing', 'ri-1']

		expect(store.activeRecipes.map((recipe) => recipe.id)).toEqual(['recipe-1'])
		expect(store.archivedRecipes.map((recipe) => recipe.id)).toEqual(['recipe-2'])
		expect(store.getRecipeItems('recipe-1').map((item) => item.id)).toEqual(['ri-1'])
	})

	it('fetches recipe collections with status and search query parameters', async () => {
		const store = useRecipesStore()
		vi.spyOn(apiClient, 'apiFetch')
			.mockResolvedValueOnce({
				recipes: [createRecipeSummary({ id: 'recipe-1', name: 'Pasta' })]
			})
			.mockResolvedValueOnce({
				recipes: [
					createRecipeSummary({
						id: 'recipe-2',
						name: 'Archief',
						status: 'archived'
					})
				]
			})

		await store.fetchRecipes({ q: 'pas' })
		await store.fetchRecipes({ status: 'archived' })

		expect(apiClient.apiFetch).toHaveBeenNthCalledWith(1, '/api/recipes?status=active&q=pas')
		expect(apiClient.apiFetch).toHaveBeenNthCalledWith(2, '/api/recipes?status=archived')
		expect(store.activeRecipeIds).toEqual(['recipe-1'])
		expect(store.archivedRecipeIds).toEqual(['recipe-2'])
		expect(store.isLoading).toBe(false)
	})

	it('stores normalized fetch errors and clears loading state', async () => {
		const store = useRecipesStore()
		const error = { code: 'NETWORK', message: 'Offline.' }
		vi.spyOn(apiClient, 'apiFetch').mockRejectedValueOnce(error)

		await expect(store.fetchRecipes()).rejects.toEqual(error)

		expect(store.error).toEqual(error)
		expect(store.isLoading).toBe(false)
	})

	it('fetches one recipe, stores detail summary, and removes stale recipe items', async () => {
		const store = useRecipesStore()
		store.recipeItemsById.stale = createRecipeItem({ id: 'stale', recipeId: 'recipe-1' })
		store.recipeItemIdsByRecipeId['recipe-1'] = ['stale']
		vi.spyOn(apiClient, 'apiFetch').mockResolvedValueOnce({
			recipe: createRecipeDetail({
				id: 'recipe-1',
				name: 'Pasta',
				items: [createRecipeItem({ id: 'ri-1', recipeId: 'recipe-1', name: 'Tomaat' })]
			})
		})

		await store.fetchRecipe('recipe-1')

		expect(store.recipesById['recipe-1']).toMatchObject({
			id: 'recipe-1',
			name: 'Pasta',
			status: 'active'
		})
		expect(store.recipeItemIdsByRecipeId['recipe-1']).toEqual(['ri-1'])
		expect(store.recipeItemsById['ri-1']?.name).toBe('Tomaat')
		expect(store.recipeItemsById.stale).toBeUndefined()
	})

	it('creates a recipe, stores its items, and prepends it to active recipes', async () => {
		const store = useRecipesStore()
		store.activeRecipeIds = ['existing']
		vi.spyOn(apiClient, 'apiFetch').mockResolvedValueOnce({
			recipe: createRecipeDetail({
				id: 'recipe-1',
				name: 'Nieuw',
				items: [createRecipeItem({ id: 'ri-1', recipeId: 'recipe-1' })]
			})
		})

		await store.createRecipe({ name: 'Nieuw', items: [] })

		expect(apiClient.apiFetch).toHaveBeenCalledWith('/api/recipes', {
			method: 'POST',
			body: { name: 'Nieuw', items: [] }
		})
		expect(store.activeRecipeIds).toEqual(['recipe-1', 'existing'])
		expect(store.recipeItemIdsByRecipeId['recipe-1']).toEqual(['ri-1'])
		expect(store.isSaving).toBe(false)
	})

	it('updates a recipe optimistically and applies the server updatedAt value', async () => {
		const store = useRecipesStore()
		store.recipesById['recipe-1'] = createRecipeSummary({
			id: 'recipe-1',
			name: 'Oud',
			description: 'oud',
			servings: 2
		})
		vi.spyOn(apiClient, 'apiFetch').mockResolvedValueOnce({
			recipe: { id: 'recipe-1', updatedAt: 9 }
		})

		await store.updateRecipe('recipe-1', {
			name: 'Nieuw',
			description: null,
			servings: 4
		})

		expect(store.recipesById['recipe-1']).toMatchObject({
			name: 'Nieuw',
			servings: 4,
			updatedAt: 9
		})
		expect(store.recipesById['recipe-1']?.description).toBeUndefined()
		expect(store.isSaving).toBe(false)
	})

	it('rolls back optimistic recipe updates when the request fails', async () => {
		const store = useRecipesStore()
		const error = { code: 'CONFLICT', message: 'Update mislukt.' }
		store.recipesById['recipe-1'] = createRecipeSummary({ id: 'recipe-1', name: 'Oud' })
		vi.spyOn(apiClient, 'apiFetch').mockRejectedValueOnce(error)

		await expect(store.updateRecipe('recipe-1', { name: 'Nieuw' })).rejects.toEqual(error)

		expect(store.recipesById['recipe-1']?.name).toBe('Oud')
		expect(store.error).toEqual(error)
	})

	it('archives recipes optimistically and applies server status', async () => {
		const store = useRecipesStore()
		store.recipesById['recipe-1'] = createRecipeSummary({ id: 'recipe-1' })
		store.activeRecipeIds = ['recipe-1']
		vi.spyOn(apiClient, 'apiFetch').mockResolvedValueOnce({
			recipe: { id: 'recipe-1', status: 'archived', archivedAt: 10 }
		})

		await store.archiveRecipe('recipe-1')

		expect(store.recipesById['recipe-1']?.status).toBe('archived')
		expect(store.activeRecipeIds).toEqual([])
		expect(store.archivedRecipeIds).toEqual(['recipe-1'])
		expect(store.isSaving).toBe(false)
	})

	it('rolls back recipe archive state when the request fails', async () => {
		const store = useRecipesStore()
		const error = { code: 'CONFLICT', message: 'Archive mislukt.' }
		store.recipesById['recipe-1'] = createRecipeSummary({ id: 'recipe-1' })
		store.activeRecipeIds = ['recipe-1']
		vi.spyOn(apiClient, 'apiFetch').mockRejectedValueOnce(error)

		await expect(store.archiveRecipe('recipe-1')).rejects.toEqual(error)

		expect(store.recipesById['recipe-1']?.status).toBe('active')
		expect(store.activeRecipeIds).toEqual(['recipe-1'])
		expect(store.archivedRecipeIds).toEqual([])
	})

	it('deletes recipes and removes their item state optimistically', async () => {
		const store = useRecipesStore()
		store.recipesById['recipe-1'] = createRecipeSummary({ id: 'recipe-1' })
		store.activeRecipeIds = ['recipe-1']
		store.recipeItemsById['ri-1'] = createRecipeItem({ id: 'ri-1', recipeId: 'recipe-1' })
		store.recipeItemIdsByRecipeId['recipe-1'] = ['ri-1']
		vi.spyOn(apiClient, 'apiFetch').mockResolvedValueOnce({
			recipe: { id: 'recipe-1', status: 'deleted', deletedAt: 11 }
		})

		await store.deleteRecipe('recipe-1')

		expect(store.recipesById['recipe-1']).toBeUndefined()
		expect(store.activeRecipeIds).toEqual([])
		expect(store.recipeItemsById['ri-1']).toBeUndefined()
		expect(store.recipeItemIdsByRecipeId['recipe-1']).toBeUndefined()
		expect(store.isSaving).toBe(false)
	})

	it('rolls back recipe deletion when the request fails', async () => {
		const store = useRecipesStore()
		const error = { code: 'CONFLICT', message: 'Delete mislukt.' }
		store.recipesById['recipe-1'] = createRecipeSummary({ id: 'recipe-1' })
		store.activeRecipeIds = ['recipe-1']
		store.recipeItemsById['ri-1'] = createRecipeItem({ id: 'ri-1', recipeId: 'recipe-1' })
		store.recipeItemIdsByRecipeId['recipe-1'] = ['ri-1']
		vi.spyOn(apiClient, 'apiFetch').mockRejectedValueOnce(error)

		await expect(store.deleteRecipe('recipe-1')).rejects.toEqual(error)

		expect(store.recipesById['recipe-1']).toBeDefined()
		expect(store.activeRecipeIds).toEqual(['recipe-1'])
		expect(store.recipeItemIdsByRecipeId['recipe-1']).toEqual(['ri-1'])
	})

	it('adds recipe items optimistically and replaces temporary state with server state', async () => {
		const store = useRecipesStore()
		store.recipeItemIdsByRecipeId['recipe-1'] = []
		vi.spyOn(apiClient, 'apiFetch').mockResolvedValueOnce({
			recipeItem: createRecipeItem({ id: 'ri-real', recipeId: 'recipe-1', name: 'Melk' })
		})

		await store.addRecipeItem('recipe-1', { name: 'Melk' })

		expect(store.recipeItemIdsByRecipeId['recipe-1']).toEqual(['ri-real'])
		expect(store.recipeItemsById['ri-real']?.name).toBe('Melk')
		expect(Object.keys(store.recipeItemsById).some((id) => id.startsWith('tmp-'))).toBe(false)
	})

	it('removes optimistic recipe items when add item fails', async () => {
		const store = useRecipesStore()
		const error = { code: 'CONFLICT', message: 'Add mislukt.' }
		store.recipeItemIdsByRecipeId['recipe-1'] = ['existing']
		store.recipeItemsById.existing = createRecipeItem({
			id: 'existing',
			recipeId: 'recipe-1'
		})
		vi.spyOn(apiClient, 'apiFetch').mockRejectedValueOnce(error)

		await expect(store.addRecipeItem('recipe-1', { name: 'Melk' })).rejects.toEqual(error)

		expect(store.recipeItemIdsByRecipeId['recipe-1']).toEqual(['existing'])
		expect(Object.keys(store.recipeItemsById)).toEqual(['existing'])
		expect(store.isSaving).toBe(false)
	})

	it('updates recipe items optimistically and applies server updatedAt', async () => {
		const store = useRecipesStore()
		store.recipeItemsById['ri-1'] = createRecipeItem({
			id: 'ri-1',
			amount: 1,
			unit: 'stuk',
			note: 'oud'
		})
		vi.spyOn(apiClient, 'apiFetch').mockResolvedValueOnce({
			recipeItem: { id: 'ri-1', updatedAt: 12 }
		})

		await store.updateRecipeItem('ri-1', { amount: null, unit: 'kg', note: null })

		expect(store.recipeItemsById['ri-1']).toMatchObject({
			unit: 'kg',
			updatedAt: 12
		})
		expect(store.recipeItemsById['ri-1']?.amount).toBeUndefined()
		expect(store.recipeItemsById['ri-1']?.note).toBeUndefined()
	})

	it('rolls back recipe item updates when the request fails', async () => {
		const store = useRecipesStore()
		const error = { code: 'CONFLICT', message: 'Update item mislukt.' }
		store.recipeItemsById['ri-1'] = createRecipeItem({ id: 'ri-1', amount: 1 })
		vi.spyOn(apiClient, 'apiFetch').mockRejectedValueOnce(error)

		await expect(store.updateRecipeItem('ri-1', { amount: 2 })).rejects.toEqual(error)

		expect(store.recipeItemsById['ri-1']?.amount).toBe(1)
	})

	it('deletes recipe items, no-ops for missing items, and rolls back on failure', async () => {
		const store = useRecipesStore()
		store.recipeItemsById.success = createRecipeItem({ id: 'success', recipeId: 'recipe-1' })
		store.recipeItemsById.failure = createRecipeItem({ id: 'failure', recipeId: 'recipe-1' })
		store.recipeItemIdsByRecipeId['recipe-1'] = ['success', 'failure']
		vi.spyOn(apiClient, 'apiFetch')
			.mockResolvedValueOnce({ ok: true })
			.mockRejectedValueOnce({ code: 'CONFLICT', message: 'Delete item mislukt.' })

		await store.deleteRecipeItem('success')
		await store.deleteRecipeItem('missing')
		expect(store.recipeItemsById.success).toBeUndefined()
		expect(store.recipeItemIdsByRecipeId['recipe-1']).toEqual(['failure'])

		await expect(store.deleteRecipeItem('failure')).rejects.toEqual({
			code: 'CONFLICT',
			message: 'Delete item mislukt.'
		})
		expect(store.recipeItemsById.failure).toBeDefined()
		expect(store.recipeItemIdsByRecipeId['recipe-1']).toEqual(['failure'])
	})

	it('reorders recipe items optimistically and applies server positions', async () => {
		const store = useRecipesStore()
		store.recipeItemsById['ri-1'] = createRecipeItem({ id: 'ri-1', recipeId: 'recipe-1' })
		store.recipeItemsById['ri-2'] = createRecipeItem({
			id: 'ri-2',
			recipeId: 'recipe-1',
			position: 1
		})
		store.recipeItemIdsByRecipeId['recipe-1'] = ['ri-1', 'ri-2']
		vi.spyOn(apiClient, 'apiFetch').mockResolvedValueOnce({
			items: [
				{ id: 'ri-2', position: 0 },
				{ id: 'ri-1', position: 1 }
			]
		})

		await store.reorderRecipeItems('recipe-1', ['ri-2', 'ri-1'])

		expect(store.recipeItemIdsByRecipeId['recipe-1']).toEqual(['ri-2', 'ri-1'])
		expect(store.recipeItemsById['ri-2']?.position).toBe(0)
		expect(store.recipeItemsById['ri-1']?.position).toBe(1)
	})

	it('reorders recipe items optimistically and rolls back when request fails', async () => {
		const store = useRecipesStore()
		store.recipeItemsById['ri-1'] = createRecipeItem({ id: 'ri-1', recipeId: 'recipe-1' })
		store.recipeItemsById['ri-2'] = createRecipeItem({
			id: 'ri-2',
			recipeId: 'recipe-1',
			position: 1
		})
		store.recipeItemIdsByRecipeId['recipe-1'] = ['ri-1', 'ri-2']
		vi.spyOn(apiClient, 'apiFetch')
			.mockRejectedValueOnce({ code: 'CONFLICT', message: 'Fout bij bewaren.' })
			.mockResolvedValueOnce({
				recipe: createRecipeDetail({
					id: 'recipe-1',
					items: [
						createRecipeItem({ id: 'ri-1', recipeId: 'recipe-1' }),
						createRecipeItem({ id: 'ri-2', recipeId: 'recipe-1', position: 1 })
					]
				})
			})

		await expect(store.reorderRecipeItems('recipe-1', ['ri-2', 'ri-1'])).rejects.toEqual({
			code: 'CONFLICT',
			message: 'Fout bij bewaren.'
		})

		expect(store.recipeItemIdsByRecipeId['recipe-1']).toEqual(['ri-1', 'ri-2'])
		expect(store.recipeItemsById['ri-1']?.position).toBe(0)
		expect(store.recipeItemsById['ri-2']?.position).toBe(1)
	})

	it('opens, closes, and refreshes recipes through refresh controllers', async () => {
		const store = useRecipesStore()
		vi.spyOn(apiClient, 'apiFetch').mockResolvedValueOnce({
			recipe: createRecipeDetail({ id: 'recipe-1', items: [] })
		})

		await store.openRecipe('recipe-1')
		store.closeRecipe()
		await store.startRecipesRefresh()
		store.stopRecipesRefresh()

		expect(store.activeRecipeId).toBeNull()
		expect(refreshControllers[1]?.start).toHaveBeenCalledTimes(1)
		expect(refreshControllers[1]?.stop).toHaveBeenCalledTimes(1)
		expect(refreshControllers[0]?.start).toHaveBeenCalledTimes(1)
		expect(refreshControllers[0]?.stop).toHaveBeenCalledTimes(1)
	})
})

function mockRefreshComposable() {
	vi.spyOn(refreshComposable, 'useStoreRefresh').mockImplementation(() => {
		const controller: RefreshController = {
			isRunning: false,
			isRefreshing: false,
			start: vi.fn(async () => undefined),
			stop: vi.fn(),
			refreshNow: vi.fn(async () => undefined)
		}
		refreshControllers.push(controller)

		return controller as never
	})
}

function createRecipeSummary(overrides: Partial<ReturnType<typeof createRecipeSummaryShape>> = {}) {
	return {
		...createRecipeSummaryShape(),
		...overrides
	}
}

function createRecipeSummaryShape() {
	return {
		id: 'recipe-1',
		name: 'Pasta',
		description: undefined as string | undefined,
		servings: undefined as number | undefined,
		status: 'active' as const,
		updatedAt: 1
	}
}

function createRecipeDetail(
	overrides: Partial<Omit<ReturnType<typeof createRecipeDetailShape>, 'items'>> & {
		items?: ReturnType<typeof createRecipeItem>[]
	} = {}
) {
	return {
		...createRecipeDetailShape(),
		...overrides
	}
}

function createRecipeDetailShape() {
	return {
		id: 'recipe-1',
		name: 'Pasta',
		description: undefined as string | undefined,
		servings: undefined as number | undefined,
		status: 'active' as const,
		items: [] as ReturnType<typeof createRecipeItem>[]
	}
}

function createRecipeItem(overrides: Partial<ReturnType<typeof createRecipeItemShape>> = {}) {
	return {
		...createRecipeItemShape(),
		...overrides,
		itemId: overrides.itemId ?? `item-${overrides.id ?? 'ri-1'}`
	}
}

function createRecipeItemShape() {
	return {
		id: 'ri-1',
		recipeId: 'recipe-1',
		itemId: 'item-ri-1',
		name: 'Tomaat',
		amount: undefined as number | undefined,
		unit: undefined as string | undefined,
		note: undefined as string | undefined,
		position: 0,
		updatedAt: undefined as number | undefined
	}
}
