import { useConfirmDialog } from '~/composables/useConfirmDialog'
import { useIcon } from '~/composables/useIcon'
import { orchestrateRefresh } from '~/composables/useStoreRefresh'
import * as apiClient from '~/utils/api-client'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
	create: vi.fn()
}))

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
})

function route(path: string, params: Record<string, string> = {}) {
	return { path, params }
}
