import { useListsStore } from '~/stores/lists'
import { useRecipesStore } from '~/stores/recipes'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
	incrementUsage: vi.fn(),
	toastAdd: vi.fn()
}))

vi.mock('~/composables/useRecipeUsage', () => ({
	useRecipeUsage: () => ({
		incrementUsage: mocks.incrementUsage
	})
}))

describe('useRecipeAddToList', () => {
	beforeEach(() => {
		setActivePinia(createPinia())
		mocks.incrementUsage.mockReset()
		mocks.toastAdd.mockReset()
	})

	afterEach(() => {
		vi.unstubAllGlobals()
	})

	it('adds a recipe to a selected list and tracks usage', async () => {
		const listsStore = useListsStore()
		const recipesStore = useRecipesStore()

		listsStore.listsById['list-1'] = createList({ id: 'list-1', name: 'Weekboodschappen' })
		listsStore.activeListIds = ['list-1']
		recipesStore.recipeItemsById['ri-1'] = {
			id: 'ri-1',
			recipeId: 'recipe-1',
			itemId: 'item-1',
			name: 'Tomaat',
			position: 0
		}
		recipesStore.recipeItemIdsByRecipeId['recipe-1'] = ['ri-1']

		const addRecipeToList = vi
			.spyOn(listsStore, 'addRecipeToList')
			.mockResolvedValueOnce([] as never)

		vi.stubGlobal('useListsStore', () => listsStore)
		vi.stubGlobal('useRecipesStore', () => recipesStore)
		vi.stubGlobal('useToast', () => ({
			add: mocks.toastAdd
		}))

		const { useRecipeAddToList } = await import('~/composables/useRecipeAddToList')
		const recipeAddToList = useRecipeAddToList('recipe-1')

		expect(recipeAddToList.canAddToList.value).toBe(true)

		await recipeAddToList.targetListItems.value[0]?.onSelect?.()

		expect(addRecipeToList).toHaveBeenCalledWith('recipe-1', 'list-1')
		expect(mocks.incrementUsage).toHaveBeenCalledWith('recipe-1')
		expect(mocks.toastAdd).toHaveBeenCalledWith(
			expect.objectContaining({
				title: 'Recept toegevoegd aan lijst.',
				color: 'success'
			})
		)
		expect(recipeAddToList.isAddingToList.value).toBe(false)
	})

	it('explains why add-to-list is disabled when a recipe has no ingredients or lists', async () => {
		const listsStore = useListsStore()
		const recipesStore = useRecipesStore()

		vi.stubGlobal('useListsStore', () => listsStore)
		vi.stubGlobal('useRecipesStore', () => recipesStore)
		vi.stubGlobal('useToast', () => ({
			add: mocks.toastAdd
		}))

		const { useRecipeAddToList } = await import('~/composables/useRecipeAddToList')
		const withoutItems = useRecipeAddToList('recipe-1')

		expect(withoutItems.canAddToList.value).toBe(false)
		expect(withoutItems.disabledReason.value).toBe('Voeg eerst ingredienten toe aan dit recept.')

		recipesStore.recipeItemsById['ri-1'] = {
			id: 'ri-1',
			recipeId: 'recipe-1',
			itemId: 'item-1',
			name: 'Tomaat',
			position: 0
		}
		recipesStore.recipeItemIdsByRecipeId['recipe-1'] = ['ri-1']

		const withoutLists = useRecipeAddToList('recipe-1')

		expect(withoutLists.canAddToList.value).toBe(false)
		expect(withoutLists.disabledReason.value).toBe(
			'Maak eerst een lijst aan om dit recept toe te voegen.'
		)
	})

	it('shows a toast error when add-to-list fails', async () => {
		const listsStore = useListsStore()
		const recipesStore = useRecipesStore()

		listsStore.listsById['list-1'] = createList({ id: 'list-1', name: 'Weekboodschappen' })
		listsStore.activeListIds = ['list-1']
		recipesStore.recipeItemsById['ri-1'] = {
			id: 'ri-1',
			recipeId: 'recipe-1',
			itemId: 'item-1',
			name: 'Tomaat',
			position: 0
		}
		recipesStore.recipeItemIdsByRecipeId['recipe-1'] = ['ri-1']

		vi.spyOn(listsStore, 'addRecipeToList').mockRejectedValueOnce({
			code: 'CONFLICT',
			message: 'Toevoegen mislukt.'
		})

		vi.stubGlobal('useListsStore', () => listsStore)
		vi.stubGlobal('useRecipesStore', () => recipesStore)
		vi.stubGlobal('useToast', () => ({
			add: mocks.toastAdd
		}))

		const { useRecipeAddToList } = await import('~/composables/useRecipeAddToList')
		const recipeAddToList = useRecipeAddToList('recipe-1')

		await recipeAddToList.addToList('list-1')

		expect(mocks.incrementUsage).not.toHaveBeenCalled()
		expect(mocks.toastAdd).toHaveBeenCalledWith(
			expect.objectContaining({
				title: 'Toevoegen mislukt.',
				color: 'error'
			})
		)
		expect(recipeAddToList.isAddingToList.value).toBe(false)
	})
})

function createList(overrides: Record<string, unknown> = {}) {
	return {
		id: 'list-1',
		name: 'Boodschappen',
		icon: 'lucide:list',
		status: 'active',
		position: 0,
		createdAt: 1,
		updatedAt: 1,
		...overrides
	}
}
