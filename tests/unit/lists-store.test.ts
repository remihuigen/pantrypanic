import * as refreshComposable from '~/composables/useStoreRefresh'
import { useListsStore } from '~/stores/lists'
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

describe('useListsStore', () => {
	beforeEach(() => {
		setActivePinia(createPinia())
		vi.restoreAllMocks()
		refreshControllers = []
		mockRefreshComposable()
		vi.spyOn(apiClient, 'normalizeAppError').mockImplementation((error) => error as never)
	})

	it('derives active lists, list suggestions, and list items from ids', () => {
		const store = useListsStore()
		store.listsById['list-1'] = createList({ id: 'list-1', name: 'Eerste' })
		store.listsById['list-2'] = createList({ id: 'list-2', name: 'Tweede' })
		store.activeListIds = ['missing', 'list-2', 'list-1']
		store.itemsById['item-1'] = { id: 'item-1', name: 'Melk' }
		store.suggestionItemIds = ['missing', 'item-1']
		store.listItemsById['li-1'] = createListItem({ id: 'li-1', listId: 'list-1' })
		store.listItemIdsByListId['list-1'] = ['missing', 'li-1']

		expect(store.activeLists.map((list) => list.id)).toEqual(['list-2', 'list-1'])
		expect(store.listSuggestions).toEqual([{ id: 'item-1', name: 'Melk', usageCount: 0 }])
		expect(store.listItemsForList('list-1').map((item) => item.id)).toEqual(['li-1'])
	})

	it('fetches active and archived list collections in server position order', async () => {
		const store = useListsStore()
		vi.spyOn(apiClient, 'apiFetch')
			.mockResolvedValueOnce({
				lists: [
					createList({ id: 'list-2', name: 'Tweede', position: 1 }),
					createList({ id: 'list-1', name: 'Eerste', icon: 'lucide:book', position: 0 })
				]
			})
			.mockResolvedValueOnce({
				lists: [
					createList({
						id: 'archived-1',
						name: 'Archief',
						position: 3,
						status: 'archived'
					})
				]
			})

		await expect(store.fetchLists()).resolves.toHaveLength(2)
		await expect(store.fetchLists('archived')).resolves.toHaveLength(1)

		expect(apiClient.apiFetch).toHaveBeenNthCalledWith(1, '/api/lists?status=active')
		expect(apiClient.apiFetch).toHaveBeenNthCalledWith(2, '/api/lists?status=archived')
		expect(store.activeListIds).toEqual(['list-1', 'list-2'])
		expect(store.listsById['list-1']?.icon).toBe('lucide:book')
		expect(store.archivedListIds).toEqual(['archived-1'])
		expect(store.isLoading).toBe(false)
	})

	it('stores normalized fetch errors and clears loading state', async () => {
		const store = useListsStore()
		const error = { code: 'NETWORK', message: 'Offline.' }
		vi.spyOn(apiClient, 'apiFetch').mockRejectedValueOnce(error)

		await expect(store.fetchLists()).rejects.toEqual(error)

		expect(store.error).toEqual(error)
		expect(store.isLoading).toBe(false)
	})

	it('creates active lists and keeps list order positions in sync', async () => {
		const store = useListsStore()
		store.listsById['list-1'] = createList({ id: 'list-1', position: 0 })
		store.activeListIds = ['list-1']
		vi.spyOn(apiClient, 'apiFetch').mockResolvedValueOnce({
			list: createList({ id: 'list-2', name: 'Nieuw', icon: 'lucide:list', position: 99 })
		})

		await store.createList({ name: 'Nieuw' })

		expect(apiClient.apiFetch).toHaveBeenCalledWith('/api/lists', {
			method: 'POST',
			body: { name: 'Nieuw' }
		})
		expect(store.activeListIds).toEqual(['list-1', 'list-2'])
		expect(store.listsById['list-2']?.icon).toBe('lucide:list')
		expect(store.listsById['list-1']?.position).toBe(0)
		expect(store.listsById['list-2']?.position).toBe(1)
		expect(store.isSaving).toBe(false)
	})

	it('updates a list summary from the API response', async () => {
		const store = useListsStore()
		store.listsById['list-1'] = createList({ id: 'list-1', name: 'Oud' })
		vi.spyOn(apiClient, 'apiFetch').mockResolvedValueOnce({
			list: createList({ id: 'list-1', name: 'Nieuw', updatedAt: 2 })
		})

		await store.updateList('list-1', { name: 'Nieuw' })

		expect(apiClient.apiFetch).toHaveBeenCalledWith('/api/lists/list-1', {
			method: 'PATCH',
			body: { name: 'Nieuw' }
		})
		expect(store.listsById['list-1']?.name).toBe('Nieuw')
		expect(store.listsById['list-1']?.updatedAt).toBe(2)
		expect(store.isSaving).toBe(false)
	})

	it('fetches one list, stores its items, and removes stale list items', async () => {
		const store = useListsStore()
		store.listItemsById['stale'] = createListItem({ id: 'stale', listId: 'list-1' })
		store.listItemIdsByListId['list-1'] = ['stale']
		vi.spyOn(apiClient, 'apiFetch').mockResolvedValueOnce({
			list: {
				...createList({ id: 'list-1', name: 'Lijst' }),
				items: [createListItem({ id: 'fresh', listId: 'list-1', name: 'Vers' })]
			}
		})

		await store.fetchList('list-1')

		expect(store.listsById['list-1']?.name).toBe('Lijst')
		expect(store.listItemIdsByListId['list-1']).toEqual(['fresh'])
		expect(store.listItemsById['fresh']?.name).toBe('Vers')
		expect(store.listItemsById.stale).toBeUndefined()
		expect(store.itemsById['item-fresh']?.name).toBe('Vers')
	})

	it('archives a list optimistically and applies API archive metadata', async () => {
		const store = useListsStore()
		store.listsById['list-1'] = createList({ id: 'list-1', position: 0 })
		store.activeListIds = ['list-1']
		vi.spyOn(apiClient, 'apiFetch').mockResolvedValueOnce({
			list: { id: 'list-1', status: 'archived', archivedAt: 10 }
		})

		await store.archiveList('list-1')

		expect(store.activeListIds).toEqual([])
		expect(store.archivedListIds).toEqual(['list-1'])
		expect(store.listsById['list-1']).toMatchObject({
			status: 'archived',
			archivedAt: 10
		})
	})

	it('rolls back archived list state when archiving fails', async () => {
		const store = useListsStore()
		const error = { code: 'CONFLICT', message: 'Kon niet archiveren.' }
		store.listsById['list-1'] = createList({ id: 'list-1', position: 0 })
		store.activeListIds = ['list-1']
		vi.spyOn(apiClient, 'apiFetch').mockRejectedValueOnce(error)

		await expect(store.archiveList('list-1')).rejects.toEqual(error)

		expect(store.activeListIds).toEqual(['list-1'])
		expect(store.archivedListIds).toEqual([])
		expect(store.listsById['list-1']?.status).toBe('active')
	})

	it('deletes a list and its list items optimistically', async () => {
		const store = useListsStore()
		store.listsById['list-1'] = createList({ id: 'list-1' })
		store.activeListIds = ['list-1']
		store.listItemsById['li-1'] = createListItem({ id: 'li-1', listId: 'list-1' })
		store.listItemIdsByListId['list-1'] = ['li-1']
		vi.spyOn(apiClient, 'apiFetch').mockResolvedValueOnce({
			list: { id: 'list-1', status: 'deleted', deletedAt: 5 }
		})

		await expect(store.deleteList('list-1')).resolves.toEqual({
			id: 'list-1',
			status: 'deleted',
			deletedAt: 5
		})
		expect(store.listsById['list-1']).toBeUndefined()
		expect(store.activeListIds).toEqual([])
		expect(store.listItemsById['li-1']).toBeUndefined()
		expect(store.listItemIdsByListId['list-1']).toBeUndefined()
	})

	it('rolls back list and item state when deleting a list fails', async () => {
		const store = useListsStore()
		const error = { code: 'CONFLICT', message: 'Kon niet verwijderen.' }
		store.listsById['list-1'] = createList({ id: 'list-1', position: 0 })
		store.activeListIds = ['list-1']
		store.listItemsById['li-1'] = createListItem({ id: 'li-1', listId: 'list-1' })
		store.listItemIdsByListId['list-1'] = ['li-1']
		vi.spyOn(apiClient, 'apiFetch').mockRejectedValueOnce(error)

		await expect(store.deleteList('list-1')).rejects.toEqual(error)

		expect(store.listsById['list-1']).toBeDefined()
		expect(store.activeListIds).toEqual(['list-1'])
		expect(store.listItemsById['li-1']).toBeDefined()
		expect(store.listItemIdsByListId['list-1']).toEqual(['li-1'])
	})

	it('reorders lists optimistically and persists server positions', async () => {
		const store = useListsStore()
		store.listsById['list-1'] = createList({ id: 'list-1', name: 'Eerste', position: 0 })
		store.listsById['list-2'] = createList({ id: 'list-2', name: 'Tweede', position: 1 })
		store.activeListIds = ['list-1', 'list-2']
		vi.spyOn(apiClient, 'apiFetch').mockResolvedValueOnce({
			lists: [
				{ id: 'list-2', position: 0 },
				{ id: 'list-1', position: 1 }
			]
		})

		await store.reorderLists(['list-2', 'list-1'])

		expect(store.activeListIds).toEqual(['list-2', 'list-1'])
		expect(store.listsById['list-2']?.position).toBe(0)
		expect(store.listsById['list-1']?.position).toBe(1)
	})

	it('rolls back list order when reorder fails', async () => {
		const store = useListsStore()
		const error = { code: 'CONFLICT', message: 'Volgorde niet opgeslagen.' }
		store.listsById['list-1'] = createList({ id: 'list-1', position: 0 })
		store.listsById['list-2'] = createList({ id: 'list-2', position: 1 })
		store.activeListIds = ['list-1', 'list-2']
		vi.spyOn(apiClient, 'apiFetch').mockRejectedValueOnce(error)

		await expect(store.reorderLists(['list-2', 'list-1'])).rejects.toEqual(error)

		expect(store.activeListIds).toEqual(['list-1', 'list-2'])
		expect(store.listsById['list-1']?.position).toBe(0)
		expect(store.listsById['list-2']?.position).toBe(1)
	})

	it('adds list items optimistically and reconciles with API response', async () => {
		const store = useListsStore()
		store.listItemIdsByListId['list-1'] = []
		vi.spyOn(apiClient, 'apiFetch').mockResolvedValueOnce({
			listItem: createListItem({
				id: 'list-item-real',
				itemId: 'item-real',
				listId: 'list-1',
				name: 'Melk'
			})
		})

		const item = await store.addListItem('list-1', { name: 'Melk' })

		expect(item.id).toBe('list-item-real')
		expect(store.listItemIdsByListId['list-1']).toEqual(['list-item-real'])
		expect(store.listItemsById['list-item-real']?.name).toBe('Melk')
		expect(Object.keys(store.listItemsById).some((id) => id.startsWith('list-item:temp'))).toBe(
			false
		)
	})

	it('removes optimistic list items when adding fails', async () => {
		const store = useListsStore()
		const error = { code: 'CONFLICT', message: 'Kon item niet toevoegen.' }
		store.listItemIdsByListId['list-1'] = ['existing']
		store.listItemsById.existing = createListItem({ id: 'existing', listId: 'list-1' })
		vi.spyOn(apiClient, 'apiFetch').mockRejectedValueOnce(error)

		await expect(store.addListItem('list-1', { name: 'Melk' })).rejects.toEqual(error)

		expect(store.listItemIdsByListId['list-1']).toEqual(['existing'])
		expect(Object.keys(store.listItemsById)).toEqual(['existing'])
		expect(Object.keys(store.itemsById).some((id) => id.startsWith('item:temp'))).toBe(false)
	})

	it('updates list item fields from the API response', async () => {
		const store = useListsStore()
		store.listItemsById['li-1'] = createListItem({ id: 'li-1', amount: 1, unit: 'stuk' })
		vi.spyOn(apiClient, 'apiFetch').mockResolvedValueOnce({
			listItem: createListItem({
				id: 'li-1',
				name: 'Tomaten',
				amount: 2,
				unit: 'kg',
				note: 'vers',
				updatedAt: 9
			})
		})

		await store.updateListItem('li-1', { name: 'Tomaten', amount: 2, unit: 'kg', note: 'vers' })

		expect(store.listItemsById['li-1']).toMatchObject({
			name: 'Tomaten',
			amount: 2,
			unit: 'kg',
			note: 'vers',
			updatedAt: 9
		})
	})

	it('moves list item ids when an item is updated to another list', async () => {
		const store = useListsStore()
		store.listItemIdsByListId['list-1'] = ['li-1']
		store.listItemIdsByListId['list-2'] = []
		store.listItemsById['li-1'] = createListItem({ id: 'li-1', listId: 'list-1' })
		vi.spyOn(apiClient, 'apiFetch').mockResolvedValueOnce({
			listItem: createListItem({ id: 'li-1', listId: 'list-2', position: 0 })
		})

		await store.updateListItem('li-1', { listId: 'list-2', name: 'Tomaat' })

		expect(store.listItemIdsByListId['list-1']).toEqual([])
		expect(store.listItemIdsByListId['list-2']).toEqual(['li-1'])
		expect(store.listItemsById['li-1']?.listId).toBe('list-2')
	})

	it('optimistically checks and unchecks list items with server timestamps', async () => {
		const store = useListsStore()
		store.listItemsById['li-1'] = createListItem({ id: 'li-1', status: 'unchecked' })
		vi.spyOn(apiClient, 'apiFetch')
			.mockResolvedValueOnce({
				listItem: { id: 'li-1', status: 'checked', checkedAt: 11 }
			})
			.mockResolvedValueOnce({
				listItem: { id: 'li-1', status: 'unchecked' }
			})

		await store.checkListItem('li-1')
		expect(store.listItemsById['li-1']).toMatchObject({
			status: 'checked',
			checkedAt: 11
		})

		await store.uncheckListItem('li-1')
		expect(store.listItemsById['li-1']).toMatchObject({
			status: 'unchecked'
		})
	})

	it('rolls back optimistic check and uncheck changes on failure', async () => {
		const store = useListsStore()
		store.listItemsById['unchecked'] = createListItem({
			id: 'unchecked',
			status: 'unchecked'
		})
		store.listItemsById['checked'] = createListItem({
			id: 'checked',
			status: 'checked',
			checkedAt: 4
		})
		vi.spyOn(apiClient, 'apiFetch')
			.mockRejectedValueOnce({ code: 'CONFLICT', message: 'Check mislukt.' })
			.mockRejectedValueOnce({ code: 'CONFLICT', message: 'Uncheck mislukt.' })

		await expect(store.checkListItem('unchecked')).rejects.toEqual({
			code: 'CONFLICT',
			message: 'Check mislukt.'
		})
		await expect(store.uncheckListItem('checked')).rejects.toEqual({
			code: 'CONFLICT',
			message: 'Uncheck mislukt.'
		})

		expect(store.listItemsById.unchecked?.status).toBe('unchecked')
		expect(store.listItemsById.checked).toMatchObject({ status: 'checked', checkedAt: 4 })
	})

	it('returns not found errors for missing check, uncheck, and delete item actions', async () => {
		const store = useListsStore()

		await expect(store.checkListItem('missing')).rejects.toEqual({
			code: 'NOT_FOUND',
			message: 'Niet gevonden.'
		})
		await expect(store.uncheckListItem('missing')).rejects.toEqual({
			code: 'NOT_FOUND',
			message: 'Niet gevonden.'
		})
		await expect(store.deleteListItem('missing')).rejects.toEqual({
			code: 'NOT_FOUND',
			message: 'Niet gevonden.'
		})
	})

	it('deletes list items optimistically and rolls back on failure', async () => {
		const store = useListsStore()
		store.listItemsById['success'] = createListItem({ id: 'success', listId: 'list-1' })
		store.listItemsById['failure'] = createListItem({ id: 'failure', listId: 'list-1' })
		store.listItemIdsByListId['list-1'] = ['success', 'failure']
		vi.spyOn(apiClient, 'apiFetch')
			.mockResolvedValueOnce({ listItem: { id: 'success', status: 'deleted', deletedAt: 1 } })
			.mockRejectedValueOnce({ code: 'CONFLICT', message: 'Delete mislukt.' })

		await store.deleteListItem('success')
		expect(store.listItemsById.success).toBeUndefined()
		expect(store.listItemIdsByListId['list-1']).toEqual(['failure'])

		await expect(store.deleteListItem('failure')).rejects.toEqual({
			code: 'CONFLICT',
			message: 'Delete mislukt.'
		})
		expect(store.listItemsById.failure).toBeDefined()
		expect(store.listItemIdsByListId['list-1']).toEqual(['failure'])
	})

	it('reorders list items optimistically and applies server positions', async () => {
		const store = useListsStore()
		store.listItemsById['li-1'] = createListItem({ id: 'li-1', listId: 'list-1', position: 0 })
		store.listItemsById['li-2'] = createListItem({ id: 'li-2', listId: 'list-1', position: 1 })
		store.listItemIdsByListId['list-1'] = ['li-1', 'li-2']
		vi.spyOn(apiClient, 'apiFetch').mockResolvedValueOnce({
			items: [
				{ id: 'li-2', position: 0 },
				{ id: 'li-1', position: 1 }
			]
		})

		await store.reorderListItems('list-1', ['li-2', 'li-1'])

		expect(store.listItemIdsByListId['list-1']).toEqual(['li-2', 'li-1'])
		expect(store.listItemsById['li-2']?.position).toBe(0)
		expect(store.listItemsById['li-1']?.position).toBe(1)
	})

	it('rolls back list item order on reorder failure', async () => {
		const store = useListsStore()
		store.listItemsById['li-1'] = createListItem({ id: 'li-1', listId: 'list-1', position: 0 })
		store.listItemsById['li-2'] = createListItem({ id: 'li-2', listId: 'list-1', position: 1 })
		store.listItemIdsByListId['list-1'] = ['li-1', 'li-2']
		vi.spyOn(apiClient, 'apiFetch').mockRejectedValueOnce({
			code: 'CONFLICT',
			message: 'Volgorde niet opgeslagen.'
		})

		await expect(store.reorderListItems('list-1', ['li-2', 'li-1'])).rejects.toEqual({
			code: 'CONFLICT',
			message: 'Volgorde niet opgeslagen.'
		})

		expect(store.listItemIdsByListId['list-1']).toEqual(['li-1', 'li-2'])
		expect(store.listItemsById['li-1']?.position).toBe(0)
		expect(store.listItemsById['li-2']?.position).toBe(1)
	})

	it('clears list items optimistically and rolls back on failure', async () => {
		const store = useListsStore()
		store.listItemsById['li-1'] = createListItem({ id: 'li-1', listId: 'list-1' })
		store.listItemIdsByListId['list-1'] = ['li-1']
		vi.spyOn(apiClient, 'apiFetch')
			.mockResolvedValueOnce({ archivedCount: 1 })
			.mockRejectedValueOnce({ code: 'CONFLICT', message: 'Clear mislukt.' })

		await expect(store.clearList('list-1')).resolves.toEqual({ archivedCount: 1 })
		expect(store.listItemsById['li-1']).toBeUndefined()
		expect(store.listItemIdsByListId['list-1']).toEqual([])

		store.listItemsById['li-1'] = createListItem({ id: 'li-1', listId: 'list-1' })
		store.listItemIdsByListId['list-1'] = ['li-1']
		await expect(store.clearList('list-1')).rejects.toEqual({
			code: 'CONFLICT',
			message: 'Clear mislukt.'
		})
		expect(store.listItemsById['li-1']).toBeDefined()
		expect(store.listItemIdsByListId['list-1']).toEqual(['li-1'])
	})

	it('clears checked list items optimistically and rolls back on failure', async () => {
		const store = useListsStore()
		store.listItemsById.checked = createListItem({
			id: 'checked',
			listId: 'list-1',
			status: 'checked'
		})
		store.listItemsById.unchecked = createListItem({
			id: 'unchecked',
			listId: 'list-1',
			status: 'unchecked'
		})
		store.listItemIdsByListId['list-1'] = ['checked', 'unchecked']
		vi.spyOn(apiClient, 'apiFetch')
			.mockResolvedValueOnce({ archivedCount: 1 })
			.mockRejectedValueOnce({ code: 'CONFLICT', message: 'Clear checked mislukt.' })

		await expect(store.clearCheckedListItems('list-1')).resolves.toEqual({ archivedCount: 1 })
		expect(apiClient.apiFetch).toHaveBeenCalledWith('/api/lists/list-1/clear-checked', {
			method: 'POST'
		})
		expect(store.listItemsById.checked).toBeUndefined()
		expect(store.listItemsById.unchecked).toBeDefined()
		expect(store.listItemIdsByListId['list-1']).toEqual(['unchecked'])

		store.listItemsById.checked = createListItem({
			id: 'checked',
			listId: 'list-1',
			status: 'checked'
		})
		store.listItemIdsByListId['list-1'] = ['checked', 'unchecked']
		await expect(store.clearCheckedListItems('list-1')).rejects.toEqual({
			code: 'CONFLICT',
			message: 'Clear checked mislukt.'
		})
		expect(store.listItemsById.checked).toBeDefined()
		expect(store.listItemIdsByListId['list-1']).toEqual(['checked', 'unchecked'])
	})

	it('adds recipe items to a list optimistically, reconciles, and refreshes the list', async () => {
		const listsStore = useListsStore()
		const recipesStore = useRecipesStore()
		listsStore.listItemIdsByListId['list-1'] = []
		recipesStore.recipeItemsById['ri-1'] = {
			id: 'ri-1',
			recipeId: 'recipe-1',
			itemId: 'item-1',
			name: 'Pasta',
			position: 0
		}
		recipesStore.recipeItemIdsByRecipeId['recipe-1'] = ['ri-1']
		vi.spyOn(apiClient, 'apiFetch')
			.mockResolvedValueOnce({
				addedItems: [
					{
						id: 'added-1',
						listId: 'list-1',
						itemId: 'item-1',
						name: 'Pasta',
						sourceType: 'recipe'
					}
				]
			})
			.mockResolvedValueOnce({
				list: {
					...createList({ id: 'list-1' }),
					items: [createListItem({ id: 'server-1', listId: 'list-1', name: 'Pasta' })]
				}
			})

		await expect(listsStore.addRecipeToList('recipe-1', 'list-1')).resolves.toEqual([
			{
				id: 'added-1',
				listId: 'list-1',
				itemId: 'item-1',
				name: 'Pasta',
				sourceType: 'recipe'
			}
		])

		expect(apiClient.apiFetch).toHaveBeenNthCalledWith(1, '/api/recipes/recipe-1/add-to-list', {
			method: 'POST',
			body: { listId: 'list-1' }
		})
		expect(listsStore.listItemIdsByListId['list-1']).toEqual(['server-1'])
		expect(listsStore.listItemsById['server-1']?.name).toBe('Pasta')
	})

	it('removes optimistic recipe list items and refreshes after add-to-list failure', async () => {
		const listsStore = useListsStore()
		const recipesStore = useRecipesStore()
		listsStore.listItemIdsByListId['list-1'] = []
		recipesStore.recipeItemsById['ri-1'] = {
			id: 'ri-1',
			recipeId: 'recipe-1',
			itemId: 'item-1',
			name: 'Pasta',
			position: 0
		}
		recipesStore.recipeItemIdsByRecipeId['recipe-1'] = ['ri-1']
		vi.spyOn(apiClient, 'apiFetch')
			.mockRejectedValueOnce({ code: 'CONFLICT', message: 'Toevoegen mislukt.' })
			.mockResolvedValueOnce({
				list: { ...createList({ id: 'list-1' }), items: [] }
			})

		await expect(listsStore.addRecipeToList('recipe-1', 'list-1')).rejects.toEqual({
			code: 'CONFLICT',
			message: 'Toevoegen mislukt.'
		})

		expect(listsStore.listItemIdsByListId['list-1']).toEqual([])
		expect(Object.keys(listsStore.listItemsById)).toEqual([])
		expect(apiClient.apiFetch).toHaveBeenNthCalledWith(2, '/api/lists/list-1')
	})

	it('fetches suggestions and searches canonical items with query parameters', async () => {
		const store = useListsStore()
		vi.spyOn(apiClient, 'apiFetch')
			.mockResolvedValueOnce({
				items: [{ id: 'item-1', name: 'Melk', usageCount: 2 }]
			})
			.mockResolvedValueOnce({
				items: [{ id: 'item-2', name: 'Brood' }]
			})

		await store.fetchSuggestions('list-1', 4)
		await store.searchItems('bro', 3)

		expect(apiClient.apiFetch).toHaveBeenNthCalledWith(
			1,
			'/api/items/suggestions?limit=4&listId=list-1'
		)
		expect(apiClient.apiFetch).toHaveBeenNthCalledWith(2, '/api/items/search?q=bro&limit=3')
		expect(store.suggestionItemIds).toEqual(['item-1'])
		expect(store.itemsById['item-1']?.name).toBe('Melk')
		expect(store.itemsById['item-2']?.name).toBe('Brood')
	})

	it('opens and closes active lists with the active-list refresh controller', async () => {
		const store = useListsStore()
		vi.spyOn(apiClient, 'apiFetch').mockResolvedValueOnce({
			list: { ...createList({ id: 'list-1' }), items: [] }
		})

		await store.openList('list-1')
		store.closeList()

		expect(store.activeListId).toBeNull()
		expect(refreshControllers[1]?.start).toHaveBeenCalledTimes(1)
		expect(refreshControllers[1]?.stop).toHaveBeenCalledTimes(1)
	})

	it('starts and stops overview refresh with the overview refresh controller', async () => {
		const store = useListsStore()

		await store.startOverviewRefresh()
		store.stopOverviewRefresh()

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

function createList(overrides: Partial<ReturnType<typeof createListShape>> = {}) {
	return {
		...createListShape(),
		...overrides
	}
}

function createListShape() {
	return {
		id: 'list-1',
		name: 'Boodschappen',
		icon: undefined as string | undefined,
		status: 'active' as const,
		position: 0,
		createdAt: 1,
		updatedAt: 1
	}
}

function createListItem(overrides: Partial<ReturnType<typeof createListItemShape>> = {}) {
	return {
		...createListItemShape(),
		...overrides,
		itemId: overrides.itemId ?? `item-${overrides.id ?? 'li-1'}`
	}
}

function createListItemShape() {
	return {
		id: 'li-1',
		listId: 'list-1',
		itemId: 'item-li-1',
		name: 'Tomaat',
		status: 'unchecked' as const,
		position: 0,
		sourceType: 'manual' as const,
		amount: undefined as number | undefined,
		unit: undefined as string | undefined,
		note: undefined as string | undefined,
		checkedAt: undefined as number | undefined,
		updatedAt: undefined as number | undefined
	}
}
