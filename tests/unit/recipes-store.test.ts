import * as refreshComposable from '~/composables/useStoreRefresh'
import { useRecipesStore } from '~/stores/recipes'
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

describe('useRecipesStore', () => {
	beforeEach(() => {
		setActivePinia(createPinia())
		vi.restoreAllMocks()
		mockRefreshComposable()
		vi.spyOn(apiClient, 'normalizeAppError').mockImplementation((error) => error as never)
	})

	it('reorders recipe items optimistically and rolls back when request fails', async () => {
		const store = useRecipesStore()
		store.recipeItemsById['ri-1'] = {
			id: 'ri-1',
			recipeId: 'recipe-1',
			itemId: 'item-1',
			name: 'A',
			position: 0
		}
		store.recipeItemsById['ri-2'] = {
			id: 'ri-2',
			recipeId: 'recipe-1',
			itemId: 'item-2',
			name: 'B',
			position: 1
		}
		store.recipeItemIdsByRecipeId['recipe-1'] = ['ri-1', 'ri-2']

		const apiFetchSpy = vi.spyOn(apiClient, 'apiFetch')
		apiFetchSpy
			.mockRejectedValueOnce({ code: 'CONFLICT', message: 'Fout bij bewaren.' })
			.mockResolvedValueOnce({
				recipe: {
					id: 'recipe-1',
					name: 'Recept',
					status: 'active',
					items: [
						{
							id: 'ri-1',
							recipeId: 'recipe-1',
							itemId: 'item-1',
							name: 'A',
							position: 0
						},
						{
							id: 'ri-2',
							recipeId: 'recipe-1',
							itemId: 'item-2',
							name: 'B',
							position: 1
						}
					]
				}
			})

		await expect(store.reorderRecipeItems('recipe-1', ['ri-2', 'ri-1'])).rejects.toEqual({
			code: 'CONFLICT',
			message: 'Fout bij bewaren.'
		})

		expect(store.recipeItemIdsByRecipeId['recipe-1']).toEqual(['ri-1', 'ri-2'])
		expect(store.recipeItemsById['ri-1']?.position).toBe(0)
		expect(store.recipeItemsById['ri-2']?.position).toBe(1)
	})
})
