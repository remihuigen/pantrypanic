import { orchestrateRefresh } from '~/composables/useStoreRefresh'
import * as apiClient from '~/utils/api-client'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('useStoreRefresh', () => {
	beforeEach(() => {
		vi.restoreAllMocks()
		setActivePinia(createPinia())
		vi.stubGlobal('useUpload', () => vi.fn())
		vi.spyOn(apiClient, 'normalizeAppError').mockImplementation((error) => error as never)
	})

	afterEach(() => {
		vi.unstubAllGlobals()
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

	it('does not poll item-vault and category settings routes', async () => {
		const apiFetch = vi.spyOn(apiClient, 'apiFetch')

		await orchestrateRefresh(route('/app/settings/item-vault'))
		await orchestrateRefresh(route('/app/settings/categories'))

		expect(apiFetch).not.toHaveBeenCalled()
	})
})

function route(path: string, params: Record<string, string> = {}) {
	return { path, params }
}
