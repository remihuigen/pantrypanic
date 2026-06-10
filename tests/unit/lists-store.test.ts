import * as refreshComposable from '~/composables/useStoreRefresh'
import { useListsStore } from '~/stores/lists'
import * as apiClient from '~/utils/api-client'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

function mockRefreshComposable() {
	vi.spyOn(refreshComposable, 'useStoreRefresh').mockReturnValue({
		isRunning: false,
		isRefreshing: false,
		start: vi.fn(async () => undefined),
		stop: vi.fn(),
		refreshNow: vi.fn(async () => undefined)
	} as never)
}

describe('useListsStore', () => {
	beforeEach(() => {
		setActivePinia(createPinia())
		vi.restoreAllMocks()
		mockRefreshComposable()
		vi.spyOn(apiClient, 'normalizeAppError').mockImplementation((error) => error as never)
	})

	it('optimistically checks a list item and rolls back on failure', async () => {
		const store = useListsStore()
		store.listItemsById['item-1'] = {
			id: 'item-1',
			listId: 'list-1',
			itemId: 'canonical-1',
			name: 'Tomaat',
			status: 'unchecked',
			position: 0,
			sourceType: 'manual'
		}
		store.listItemIdsByListId['list-1'] = ['item-1']

		vi.spyOn(apiClient, 'apiFetch').mockRejectedValueOnce({
			code: 'CONFLICT',
			message: 'Kon niet opslaan.'
		})

		await expect(store.checkListItem('item-1')).rejects.toEqual({
			code: 'CONFLICT',
			message: 'Kon niet opslaan.'
		})
		expect(store.listItemsById['item-1']?.status).toBe('unchecked')
	})

	it('reorders lists optimistically and persists server positions', async () => {
		const store = useListsStore()
		store.listsById['list-1'] = {
			id: 'list-1',
			name: 'Eerste',
			status: 'active',
			position: 0,
			createdAt: 1,
			updatedAt: 1
		}
		store.listsById['list-2'] = {
			id: 'list-2',
			name: 'Tweede',
			status: 'active',
			position: 1,
			createdAt: 1,
			updatedAt: 1
		}
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

	it('adds list items optimistically and reconciles with API response', async () => {
		const store = useListsStore()
		store.listItemIdsByListId['list-1'] = []

		vi.spyOn(apiClient, 'apiFetch').mockResolvedValueOnce({
			listItem: {
				id: 'list-item-real',
				listId: 'list-1',
				itemId: 'item-real',
				name: 'Melk',
				status: 'unchecked',
				position: 0,
				sourceType: 'manual'
			}
		})

		const item = await store.addListItem('list-1', { name: 'Melk' })

		expect(item.id).toBe('list-item-real')
		expect(store.listItemIdsByListId['list-1']).toEqual(['list-item-real'])
		expect(store.listItemsById['list-item-real']?.name).toBe('Melk')
	})
})
