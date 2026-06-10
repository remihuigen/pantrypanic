import * as refreshComposable from '~/composables/useStoreRefresh'
import { useListsStore } from '~/stores/lists'
import { useMealPlannerStore } from '~/stores/meal-planner'
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

describe('useMealPlannerStore', () => {
	beforeEach(() => {
		setActivePinia(createPinia())
		vi.restoreAllMocks()
		refreshControllers = []
		mockRefreshComposable()
		vi.spyOn(apiClient, 'normalizeAppError').mockImplementation((error) => error as never)
	})

	it('derives ordered days and day items from ids', () => {
		const store = useMealPlannerStore()
		store.mealPlannerDaysById['day-2'] = createDay({ id: 'day-2', dayOfWeek: 2 })
		store.mealPlannerDaysById['day-1'] = createDay({ id: 'day-1', dayOfWeek: 1 })
		store.mealPlannerDayIds = ['missing', 'day-2', 'day-1']
		store.mealPlannerDayItemsById['item-1'] = createDayItem({ id: 'item-1' })
		store.mealPlannerDayItemIdsByDayId['day-1'] = ['missing', 'item-1']

		expect(store.orderedDays.map((day) => day.id)).toEqual(['day-2', 'day-1'])
		expect(store.dayItems('day-1').map((item) => item.id)).toEqual(['item-1'])
	})

	it('fetches meal planner days sorted by day of week and removes stale state', async () => {
		const store = useMealPlannerStore()
		store.mealPlannerDaysById.staleDay = createDay({ id: 'staleDay', dayOfWeek: 7 })
		store.mealPlannerDayItemIdsByDayId.staleDay = ['staleItem']
		store.mealPlannerDayItemsById.staleItem = createDayItem({ id: 'staleItem' })
		vi.spyOn(apiClient, 'apiFetch').mockResolvedValueOnce({
			days: [
				createDay({
					id: 'day-2',
					dayOfWeek: 2,
					items: [createDayItem({ id: 'item-2', name: 'Dinsdag' })]
				}),
				createDay({
					id: 'day-1',
					dayOfWeek: 1,
					items: [createDayItem({ id: 'item-1', name: 'Maandag' })]
				})
			]
		})

		await store.fetchMealPlanner()

		expect(store.mealPlannerDayIds).toEqual(['day-1', 'day-2'])
		expect(store.mealPlannerDaysById.staleDay).toBeUndefined()
		expect(store.mealPlannerDayItemIdsByDayId.staleDay).toBeUndefined()
		expect(store.mealPlannerDayItemsById.staleItem).toBeUndefined()
		expect(store.mealPlannerDayItemIdsByDayId['day-1']).toEqual(['item-1'])
		expect(store.isLoading).toBe(false)
	})

	it('stores normalized fetch errors and clears loading state', async () => {
		const store = useMealPlannerStore()
		const error = { code: 'NETWORK', message: 'Offline.' }
		vi.spyOn(apiClient, 'apiFetch').mockRejectedValueOnce(error)

		await expect(store.fetchMealPlanner()).rejects.toEqual(error)

		expect(store.error).toEqual(error)
		expect(store.isLoading).toBe(false)
	})

	it('updates a day to empty, recipe, and placeholder states', async () => {
		const store = useMealPlannerStore()
		seedDay(store, createDay({ id: 'day-1', dayOfWeek: 1, type: 'placeholder' }), [
			createDayItem({ id: 'item-1' })
		])
		vi.spyOn(apiClient, 'apiFetch')
			.mockResolvedValueOnce({
				day: { id: 'day-1', dayOfWeek: 1, type: 'empty' }
			})
			.mockResolvedValueOnce({
				day: { id: 'day-1', dayOfWeek: 1, type: 'recipe', recipeId: 'recipe-1' }
			})
			.mockResolvedValueOnce({
				day: {
					id: 'day-1',
					dayOfWeek: 1,
					type: 'placeholder',
					placeholderName: 'Restjes'
				}
			})

		await store.updateMealPlannerDay(1, { type: 'empty' })
		expect(store.mealPlannerDaysById['day-1']).toMatchObject({ type: 'empty' })
		expect(store.mealPlannerDayItemIdsByDayId['day-1']).toEqual([])

		await store.updateMealPlannerDay(1, { type: 'recipe', recipeId: 'recipe-1' })
		expect(store.mealPlannerDaysById['day-1']).toMatchObject({
			type: 'recipe',
			recipeId: 'recipe-1'
		})

		await store.updateMealPlannerDay(1, {
			type: 'placeholder',
			placeholderName: 'Restjes',
			placeholderNotes: null
		})
		expect(store.mealPlannerDaysById['day-1']).toMatchObject({
			type: 'placeholder',
			placeholderName: 'Restjes'
		})
		expect(store.mealPlannerDaysById['day-1']?.placeholderNotes).toBeUndefined()
		expect(store.isSaving).toBe(false)
	})

	it('updates a day optimistically and rolls back on failure', async () => {
		const store = useMealPlannerStore()
		seedDay(store, createDay({ id: 'day-1', dayOfWeek: 1, type: 'placeholder' }), [
			createDayItem({ id: 'item-1' })
		])
		vi.spyOn(apiClient, 'apiFetch').mockRejectedValueOnce({
			code: 'CONFLICT',
			message: 'Kon dag niet opslaan.'
		})

		await expect(store.updateMealPlannerDay(1, { type: 'empty' })).rejects.toEqual({
			code: 'CONFLICT',
			message: 'Kon dag niet opslaan.'
		})

		expect(store.mealPlannerDaysById['day-1']?.type).toBe('placeholder')
		expect(store.mealPlannerDayItemIdsByDayId['day-1']).toEqual(['item-1'])
		expect(store.mealPlannerDayItemsById['item-1']).toBeDefined()
	})

	it('returns not found errors for day actions when the day is missing', async () => {
		const store = useMealPlannerStore()

		await expect(store.updateMealPlannerDay(1, { type: 'empty' })).rejects.toEqual({
			code: 'NOT_FOUND',
			message: 'Niet gevonden.'
		})
		await expect(store.addDayItem(1, { name: 'Melk' })).rejects.toEqual({
			code: 'NOT_FOUND',
			message: 'Niet gevonden.'
		})
		await expect(store.reorderDayItems(1, [])).rejects.toEqual({
			code: 'NOT_FOUND',
			message: 'Niet gevonden.'
		})
	})

	it('adds day items optimistically and replaces temporary state with server state', async () => {
		const store = useMealPlannerStore()
		seedDay(store, createDay({ id: 'day-1', dayOfWeek: 1 }))
		vi.spyOn(apiClient, 'apiFetch').mockResolvedValueOnce({
			mealPlannerDayItem: createDayItem({ id: 'real-item', name: 'Melk' })
		})

		await store.addDayItem(1, { name: 'Melk' })

		expect(store.mealPlannerDayItemIdsByDayId['day-1']).toEqual(['real-item'])
		expect(store.mealPlannerDayItemsById['real-item']?.name).toBe('Melk')
		expect(
			Object.keys(store.mealPlannerDayItemsById).some((id) => id.startsWith('meal-day-item'))
		).toBe(false)
	})

	it('removes optimistic day items when adding fails', async () => {
		const store = useMealPlannerStore()
		seedDay(store, createDay({ id: 'day-1', dayOfWeek: 1 }), [createDayItem({ id: 'item-1' })])
		vi.spyOn(apiClient, 'apiFetch').mockRejectedValueOnce({
			code: 'CONFLICT',
			message: 'Add mislukt.'
		})

		await expect(store.addDayItem(1, { name: 'Melk' })).rejects.toEqual({
			code: 'CONFLICT',
			message: 'Add mislukt.'
		})

		expect(store.mealPlannerDayItemIdsByDayId['day-1']).toEqual(['item-1'])
		expect(Object.keys(store.mealPlannerDayItemsById)).toEqual(['item-1'])
	})

	it('updates day items optimistically and applies server updatedAt', async () => {
		const store = useMealPlannerStore()
		seedDay(store, createDay({ id: 'day-1', dayOfWeek: 1 }), [
			createDayItem({ id: 'item-1', amount: 1, unit: 'stuk', note: 'oud' })
		])
		vi.spyOn(apiClient, 'apiFetch').mockResolvedValueOnce({
			mealPlannerDayItem: { id: 'item-1', updatedAt: 8 }
		})

		await store.updateDayItem('item-1', { amount: null, unit: 'kg', note: null })

		expect(store.mealPlannerDayItemsById['item-1']).toMatchObject({
			unit: 'kg',
			updatedAt: 8
		})
		expect(store.mealPlannerDayItemsById['item-1']?.amount).toBeUndefined()
		expect(store.mealPlannerDayItemsById['item-1']?.note).toBeUndefined()
	})

	it('rolls back day item updates and returns not found for missing items', async () => {
		const store = useMealPlannerStore()
		seedDay(store, createDay({ id: 'day-1', dayOfWeek: 1 }), [
			createDayItem({ id: 'item-1', amount: 1 })
		])
		vi.spyOn(apiClient, 'apiFetch').mockRejectedValueOnce({
			code: 'CONFLICT',
			message: 'Update mislukt.'
		})

		await expect(store.updateDayItem('item-1', { amount: 2 })).rejects.toEqual({
			code: 'CONFLICT',
			message: 'Update mislukt.'
		})
		await expect(store.updateDayItem('missing', { amount: 2 })).rejects.toEqual({
			code: 'NOT_FOUND',
			message: 'Niet gevonden.'
		})
		expect(store.mealPlannerDayItemsById['item-1']?.amount).toBe(1)
	})

	it('deletes day items optimistically and rolls back on failure', async () => {
		const store = useMealPlannerStore()
		seedDay(store, createDay({ id: 'day-1', dayOfWeek: 1 }), [
			createDayItem({ id: 'success' }),
			createDayItem({ id: 'failure' })
		])
		vi.spyOn(apiClient, 'apiFetch')
			.mockResolvedValueOnce({ ok: true })
			.mockRejectedValueOnce({ code: 'CONFLICT', message: 'Delete mislukt.' })

		await store.deleteDayItem('success')
		expect(store.mealPlannerDayItemsById.success).toBeUndefined()
		expect(store.mealPlannerDayItemIdsByDayId['day-1']).toEqual(['failure'])

		await expect(store.deleteDayItem('failure')).rejects.toEqual({
			code: 'CONFLICT',
			message: 'Delete mislukt.'
		})
		expect(store.mealPlannerDayItemsById.failure).toBeDefined()
		expect(store.mealPlannerDayItemIdsByDayId['day-1']).toEqual(['failure'])
	})

	it('returns not found when deleting an item not assigned to any day', async () => {
		const store = useMealPlannerStore()

		await expect(store.deleteDayItem('missing')).rejects.toEqual({
			code: 'NOT_FOUND',
			message: 'Niet gevonden.'
		})
	})

	it('reorders day items optimistically and applies server positions', async () => {
		const store = useMealPlannerStore()
		seedDay(store, createDay({ id: 'day-1', dayOfWeek: 1 }), [
			createDayItem({ id: 'item-1', position: 0 }),
			createDayItem({ id: 'item-2', position: 1 })
		])
		vi.spyOn(apiClient, 'apiFetch').mockResolvedValueOnce({
			items: [
				{ id: 'item-2', position: 0 },
				{ id: 'item-1', position: 1 }
			]
		})

		await store.reorderDayItems(1, ['item-2', 'item-1'])

		expect(store.mealPlannerDayItemIdsByDayId['day-1']).toEqual(['item-2', 'item-1'])
		expect(store.mealPlannerDayItemsById['item-2']?.position).toBe(0)
		expect(store.mealPlannerDayItemsById['item-1']?.position).toBe(1)
	})

	it('rolls back day item order when reorder fails', async () => {
		const store = useMealPlannerStore()
		seedDay(store, createDay({ id: 'day-1', dayOfWeek: 1 }), [
			createDayItem({ id: 'item-1', position: 0 }),
			createDayItem({ id: 'item-2', position: 1 })
		])
		vi.spyOn(apiClient, 'apiFetch').mockRejectedValueOnce({
			code: 'CONFLICT',
			message: 'Reorder mislukt.'
		})

		await expect(store.reorderDayItems(1, ['item-2', 'item-1'])).rejects.toEqual({
			code: 'CONFLICT',
			message: 'Reorder mislukt.'
		})
		expect(store.mealPlannerDayItemIdsByDayId['day-1']).toEqual(['item-1', 'item-2'])
		expect(store.mealPlannerDayItemsById['item-1']?.position).toBe(0)
		expect(store.mealPlannerDayItemsById['item-2']?.position).toBe(1)
	})

	it('adds placeholder meal planner items to a list and refreshes list state', async () => {
		const mealStore = useMealPlannerStore()
		const listsStore = useListsStore()
		listsStore.listItemIdsByListId['list-1'] = []
		seedDay(
			mealStore,
			createDay({
				id: 'day-1',
				dayOfWeek: 1,
				type: 'placeholder',
				placeholderName: 'Restjes'
			}),
			[createDayItem({ id: 'item-1', name: 'Rijst' })]
		)
		vi.spyOn(apiClient, 'apiFetch')
			.mockResolvedValueOnce({
				addedItems: [
					{
						id: 'added-1',
						listId: 'list-1',
						itemId: 'item-1',
						name: 'Rijst',
						sourceType: 'meal_planner_placeholder'
					}
				]
			})
			.mockResolvedValueOnce({
				list: { id: 'list-1', name: 'Lijst', status: 'active', position: 0, items: [] }
			})

		await expect(mealStore.addMealPlannerToList('list-1')).resolves.toEqual([
			{
				id: 'added-1',
				listId: 'list-1',
				itemId: 'item-1',
				name: 'Rijst',
				sourceType: 'meal_planner_placeholder'
			}
		])

		expect(apiClient.apiFetch).toHaveBeenNthCalledWith(1, '/api/meal-planner/add-to-list', {
			method: 'POST',
			body: { listId: 'list-1' }
		})
		expect(listsStore.listItemIdsByListId['list-1']).toEqual([])
	})

	it('removes optimistic add-to-list items and refreshes list after failure', async () => {
		const mealStore = useMealPlannerStore()
		const listsStore = useListsStore()
		listsStore.listItemIdsByListId['list-1'] = []
		seedDay(
			mealStore,
			createDay({
				id: 'day-1',
				dayOfWeek: 1,
				type: 'placeholder',
				placeholderName: 'Restjes'
			}),
			[createDayItem({ id: 'item-1', name: 'Rijst' })]
		)
		vi.spyOn(apiClient, 'apiFetch')
			.mockRejectedValueOnce({ code: 'CONFLICT', message: 'Toevoegen mislukt.' })
			.mockResolvedValueOnce({
				list: { id: 'list-1', name: 'Lijst', status: 'active', position: 0, items: [] }
			})

		await expect(mealStore.addMealPlannerToList('list-1')).rejects.toEqual({
			code: 'CONFLICT',
			message: 'Toevoegen mislukt.'
		})
		expect(listsStore.listItemIdsByListId['list-1']).toEqual([])
		expect(Object.keys(listsStore.listItemsById)).toEqual([])
		expect(apiClient.apiFetch).toHaveBeenNthCalledWith(2, '/api/lists/list-1')
	})

	it('clears the meal planner optimistically and rolls back on failure', async () => {
		const store = useMealPlannerStore()
		seedDay(
			store,
			createDay({
				id: 'day-1',
				dayOfWeek: 1,
				type: 'placeholder',
				placeholderName: 'Restjes'
			}),
			[createDayItem({ id: 'item-1' })]
		)
		vi.spyOn(apiClient, 'apiFetch')
			.mockResolvedValueOnce({ clearedDays: 1 })
			.mockRejectedValueOnce({ code: 'CONFLICT', message: 'Clear mislukt.' })

		await expect(store.clearMealPlanner()).resolves.toEqual({ clearedDays: 1 })
		expect(store.mealPlannerDaysById['day-1']?.type).toBe('empty')
		expect(store.mealPlannerDayItemIdsByDayId['day-1']).toEqual([])
		expect(store.mealPlannerDayItemsById).toEqual({})

		seedDay(
			store,
			createDay({
				id: 'day-1',
				dayOfWeek: 1,
				type: 'placeholder',
				placeholderName: 'Restjes'
			}),
			[createDayItem({ id: 'item-1' })]
		)
		await expect(store.clearMealPlanner()).rejects.toEqual({
			code: 'CONFLICT',
			message: 'Clear mislukt.'
		})
		expect(store.mealPlannerDaysById['day-1']?.type).toBe('placeholder')
		expect(store.mealPlannerDayItemIdsByDayId['day-1']).toEqual(['item-1'])
		expect(store.mealPlannerDayItemsById['item-1']).toBeDefined()
	})

	it('starts and stops planner refresh with the refresh controller', async () => {
		const store = useMealPlannerStore()

		await store.startRefresh()
		store.stopRefresh()

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

function seedDay(
	store: ReturnType<typeof useMealPlannerStore>,
	day: ReturnType<typeof createDay>,
	items: ReturnType<typeof createDayItem>[] = []
) {
	store.mealPlannerDaysById[day.id] = day
	store.mealPlannerDayIds = [...new Set([...store.mealPlannerDayIds, day.id])]
	store.mealPlannerDayItemIdsByDayId[day.id] = items.map((item) => item.id)

	for (const item of items) {
		store.mealPlannerDayItemsById[item.id] = item
	}
}

function createDay(overrides: Partial<ReturnType<typeof createDayShape>> = {}) {
	return {
		...createDayShape(),
		...overrides
	}
}

function createDayShape() {
	return {
		id: 'day-1',
		dayOfWeek: 1,
		type: 'empty' as const,
		recipeId: undefined as string | undefined,
		recipe: undefined,
		placeholderName: undefined as string | undefined,
		placeholderNotes: undefined as string | undefined,
		items: undefined as ReturnType<typeof createDayItem>[] | undefined
	}
}

function createDayItem(overrides: Partial<ReturnType<typeof createDayItemShape>> = {}) {
	return {
		...createDayItemShape(),
		...overrides,
		itemId: overrides.itemId ?? `item-${overrides.id ?? 'day-item-1'}`
	}
}

function createDayItemShape() {
	return {
		id: 'day-item-1',
		itemId: 'item-day-item-1',
		name: 'Tomaat',
		amount: undefined as number | undefined,
		unit: undefined as string | undefined,
		note: undefined as string | undefined,
		position: 0,
		updatedAt: undefined as number | undefined
	}
}
