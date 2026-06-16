import { db } from 'hub:db'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
	addListItem,
	addMealPlannerDayItem,
	addMealPlannerToList,
	addRecipeItem,
	addRecipeToList,
	archiveRecipe,
	archiveShoppingList,
	checkListItem,
	clearCheckedListItems,
	clearMealPlanner,
	clearShoppingList,
	createItemSearchQuerySchema,
	createItemSuggestionsQuerySchema,
	createListBodySchema,
	createOccurrenceBodySchema,
	createRecipe,
	createRecipeBodySchema,
	createShoppingList,
	deleteListItem,
	deleteMealPlannerDayItem,
	deleteRecipe,
	deleteRecipeItem,
	deleteShoppingList,
	getCurrentUser,
	getMealPlanner,
	getRecipe,
	getShoppingList,
	listQuerySchema,
	listRecipes,
	listShoppingLists,
	mealPlannerDayBodySchema,
	recipeQuerySchema,
	reorderListItems,
	reorderCategorizedListItems,
	reorderMealPlannerDayItems,
	reorderRecipeItems,
	reorderShoppingLists,
	searchItems,
	suggestItems,
	uncheckListItem,
	updateListBodySchema,
	updateListItem,
	updateListItemBodySchema,
	updateMealPlannerDay,
	updateMealPlannerDayItem,
	updateOccurrenceBodySchema,
	updateRecipe,
	updateRecipeBodySchema,
	updateRecipeItem,
	updateShoppingList
} from '../../server/domains'
import {
	createDeleteBuilder,
	createInsertBuilder,
	createSelectBuilder,
	createUpdateBuilder
} from './test-db'

const mocks = vi.hoisted(() => ({
	createDomainId: vi.fn(() => 'new-id'),
	findOrCreateItem: vi.fn(),
	seedInitialDomainData: vi.fn()
}))

vi.mock('#server/utils/api-helpers', () => ({
	createDomainId: mocks.createDomainId
}))

vi.mock('#server/utils/domains/items', async () => {
	const actual = await vi.importActual<typeof import('../../server/utils/domains/items')>(
		'../../server/utils/domains/items'
	)

	return {
		...actual,
		findOrCreateItem: mocks.findOrCreateItem
	}
})

vi.mock('#server/utils/domains/seed', async () => {
	const actual = await vi.importActual<typeof import('../../server/utils/domains/seed')>(
		'../../server/utils/domains/seed'
	)

	return {
		...actual,
		seedInitialDomainData: mocks.seedInitialDomainData
	}
})

describe('pantry api domain helpers', () => {
	beforeEach(() => {
		vi.mocked(db.select).mockReset()
		vi.mocked(db.insert).mockReset()
		vi.mocked(db.update).mockReset()
		vi.mocked(db.delete).mockReset()
		mocks.createDomainId.mockClear()
		mocks.findOrCreateItem.mockReset()
		mocks.findOrCreateItem.mockResolvedValue(itemRow())
		mocks.seedInitialDomainData.mockClear()
		vi.stubGlobal('useRuntimeConfig', () => ({
			pantry: {
				defaultItemSearchLimit: 10,
				maxItemSearchLimit: 50
			}
		}))
	})

	afterEach(() => {
		vi.unstubAllGlobals()
	})

	it('validates Dutch schemas', () => {
		expect(listQuerySchema.parse({})).toEqual({ status: 'active' })
		expect(createListBodySchema.parse({ name: ' Groceries ', icon: ' lucide:book ' })).toEqual({
			name: 'Groceries',
			icon: 'lucide:book'
		})
		expect(updateListBodySchema.parse({ icon: ' lucide:list ' })).toEqual({
			icon: 'lucide:list'
		})
		expect(updateListBodySchema.parse({ icon: null })).toEqual({
			icon: null
		})
		expect(createOccurrenceBodySchema.parse({ name: 'Milk', amount: 1, unit: 'l' })).toEqual({
			name: 'Milk',
			amount: 1,
			unit: 'l'
		})
		expect(createOccurrenceBodySchema.parse({ name: 'Milk', amount: null })).toEqual({
			name: 'Milk',
			amount: undefined
		})
		expect(
			updateListItemBodySchema.parse({
				listId: 'list-2',
				name: ' Bread ',
				amount: null,
				unit: ' ',
				note: null
			})
		).toEqual({
			listId: 'list-2',
			name: 'Bread',
			amount: null,
			unit: '',
			note: null
		})
		expect(createItemSearchQuerySchema().parse({ q: 'mi' })).toEqual({ q: 'mi', limit: 10 })
		expect(createItemSuggestionsQuerySchema().parse({})).toEqual({ limit: 10 })
		expect(
			createRecipeBodySchema.parse({ name: 'Pasta', sourceUrl: 'https://example.com' })
		).toMatchObject({
			name: 'Pasta',
			sourceUrl: 'https://example.com'
		})
		expect(recipeQuerySchema.parse({ q: ' pasta ' })).toEqual({ status: 'active', q: 'pasta' })
		expect(mealPlannerDayBodySchema.parse({ type: 'empty' })).toEqual({ type: 'empty' })
		expect(mealPlannerDayBodySchema.parse({ type: 'recipe', recipeId: 'recipe-1' })).toEqual({
			type: 'recipe',
			recipeId: 'recipe-1'
		})
		expect(
			mealPlannerDayBodySchema.parse({ type: 'placeholder', placeholderName: 'Soup' })
		).toEqual({
			type: 'placeholder',
			placeholderName: 'Soup'
		})
		expect(() => updateOccurrenceBodySchema.parse({})).toThrow()
		expect(() => updateRecipeBodySchema.parse({})).toThrow()
	})

	it('validates item query defaults from runtime config', () => {
		vi.stubGlobal('useRuntimeConfig', () => ({
			pantry: {
				defaultItemSearchLimit: 7,
				maxItemSearchLimit: 12
			}
		}))

		expect(createItemSearchQuerySchema().parse({ q: 'mi' })).toEqual({ q: 'mi', limit: 7 })
		expect(createItemSuggestionsQuerySchema().parse({})).toEqual({ limit: 7 })
		expect(() => createItemSearchQuerySchema().parse({ q: 'mi', limit: 13 })).toThrow()
	})

	it('handles not found and internal row failures', async () => {
		vi.mocked(db.select).mockReturnValueOnce(createSelectBuilder([]) as never)

		await expect(getCurrentUser(404)).rejects.toThrow('Niet gevonden.')

		vi.mocked(db.select).mockReturnValueOnce(createSelectBuilder([]) as never)
		vi.mocked(db.insert).mockReturnValueOnce(createInsertBuilder([]) as never)

		await expect(createShoppingList({ name: 'Broken' }, 1)).rejects.toThrow(
			'Er is iets misgegaan.'
		)
	})

	it('handles alternate list, item, and recipe branches', async () => {
		vi.mocked(db.select)
			.mockReturnValueOnce(createSelectBuilder([]) as never)
			.mockReturnValueOnce(createSelectBuilder([listRow()]) as never)
			.mockReturnValueOnce(createSelectBuilder([]) as never)
			.mockReturnValueOnce(createSelectBuilder([listItemRow()]) as never)
			.mockReturnValueOnce(createSelectBuilder([listRow()]) as never)
			.mockReturnValueOnce(createSelectBuilder([recipeRow()]) as never)
			.mockReturnValueOnce(createSelectBuilder([recipeRow()]) as never)
			.mockReturnValueOnce(createSelectBuilder([recipeRow()]) as never)
			.mockReturnValueOnce(createSelectBuilder([recipeItemRow()]) as never)

		vi.mocked(db.insert)
			.mockReturnValueOnce(
				createInsertBuilder([listRow({ id: 'empty-position-list', position: 0 })]) as never
			)
			.mockReturnValueOnce(
				createInsertBuilder([
					listItemRow({
						amount: 2,
						unit: 'l',
						note: 'Whole milk'
					})
				]) as never
			)

		vi.mocked(db.update)
			.mockReturnValueOnce(
				createUpdateBuilder([
					listItemRow({
						amount: 3,
						unit: 'l',
						note: 'Organic',
						updatedAt: 50
					})
				]) as never
			)
			.mockReturnValueOnce(createUpdateBuilder([recipeRow({ updatedAt: 51 })]) as never)
			.mockReturnValueOnce(createUpdateBuilder([recipeItemRow({ updatedAt: 52 })]) as never)
			.mockReturnValueOnce(createSelectBuilder([{ count: 2 }]) as never)
		await expect(createShoppingList({ name: 'Hardware' }, 1)).resolves.toMatchObject({
			list: { id: 'empty-position-list', position: 0 }
		})
		await expect(
			addListItem(
				'list-1',
				{
					name: 'Milk',
					amount: 2,
					unit: 'l',
					note: 'Whole milk'
				},
				1
			)
		).resolves.toMatchObject({
			listItem: { amount: 2, unit: 'l', note: 'Whole milk' }
		})
		await expect(
			updateListItem(
				'li-1',
				{
					amount: 3,
					unit: 'l',
					note: 'Organic'
				},
				1
			)
		).resolves.toMatchObject({
			listItem: { amount: 3, unit: 'l', note: 'Organic' }
		})
		await expect(listRecipes({ status: 'active', q: 'pas' })).resolves.toMatchObject({
			recipes: [{ id: 'recipe-1' }]
		})
		await expect(
			updateRecipe(
				'recipe-1',
				{
					name: 'Updated',
					description: 'Dinner',
					servings: 4,
					sourceUrl: 'https://example.com'
				},
				1
			)
		).resolves.toEqual({ recipe: { id: 'recipe-1', updatedAt: 51 } })
		await expect(
			updateRecipeItem(
				'ri-1',
				{
					amount: 1,
					unit: 'kg',
					note: 'Fresh'
				},
				1
			)
		).resolves.toEqual({ recipeItem: { id: 'ri-1', updatedAt: 52 } })
	})

	it('handles alternate meal planner day transitions and conflicts', async () => {
		vi.mocked(db.select)
			.mockReturnValueOnce(
				createSelectBuilder([mealPlannerDayRow({ type: 'empty' })]) as never
			)
			.mockReturnValueOnce(createSelectBuilder([recipeRow()]) as never)
			.mockReturnValueOnce(
				createSelectBuilder([
					mealPlannerDayRow({ type: 'placeholder', placeholderName: 'Soup' })
				]) as never
			)
			.mockReturnValueOnce(
				createSelectBuilder([mealPlannerDayRow({ type: 'empty' })]) as never
			)

		vi.mocked(db.update)
			.mockReturnValueOnce(
				createUpdateBuilder([
					mealPlannerDayRow({ type: 'recipe', recipeId: 'recipe-1' })
				]) as never
			)
			.mockReturnValueOnce(
				createUpdateBuilder([mealPlannerDayRow({ type: 'empty' })]) as never
			)
		vi.mocked(db.delete).mockReturnValue(createDeleteBuilder() as never)

		await expect(
			updateMealPlannerDay(1, { type: 'recipe', recipeId: 'recipe-1' }, 1)
		).resolves.toMatchObject({
			day: { type: 'recipe', recipeId: 'recipe-1' }
		})
		await expect(updateMealPlannerDay(1, { type: 'empty' }, 1)).resolves.toMatchObject({
			day: { type: 'empty' }
		})
		await expect(addMealPlannerDayItem(1, { name: 'Milk' }, 1)).rejects.toThrow(
			'Deze dag is geen tijdelijke maaltijd.'
		)
	})

	it('handles current user and list workflows', async () => {
		vi.mocked(db.select)
			.mockReturnValueOnce(
				createSelectBuilder([{ id: 1, name: 'Admin', email: 'admin@example.com' }]) as never
			)
			.mockReturnValueOnce(createSelectBuilder([listRow()]) as never)
			.mockReturnValueOnce(createSelectBuilder([{ position: 1 }]) as never)
			.mockReturnValueOnce(createSelectBuilder([listRow()]) as never)
			.mockReturnValueOnce(
				createSelectBuilder([{ listItem: listItemRow(), item: itemRow() }]) as never
			)
			.mockReturnValueOnce(createSelectBuilder([listRow()]) as never)
			.mockReturnValueOnce(createSelectBuilder([listRow()]) as never)
			.mockReturnValueOnce(createSelectBuilder([listRow()]) as never)
			.mockReturnValueOnce(createSelectBuilder([{ count: 2 }]) as never)
			.mockReturnValueOnce(createSelectBuilder([listRow()]) as never)
			.mockReturnValueOnce(createSelectBuilder([listRow()]) as never)
			.mockReturnValueOnce(createSelectBuilder([listRow()]) as never)
			.mockReturnValueOnce(createSelectBuilder([{ position: 2 }]) as never)
			.mockReturnValueOnce(createSelectBuilder([listRow()]) as never)
			.mockReturnValueOnce(createSelectBuilder([listItemRow()]) as never)
			.mockReturnValueOnce(createSelectBuilder([listRow()]) as never)
			.mockReturnValueOnce(createSelectBuilder([itemRow()]) as never)
			.mockReturnValueOnce(createSelectBuilder([listItemRow()]) as never)
			.mockReturnValueOnce(createSelectBuilder([listItemRow()]) as never)
			.mockReturnValueOnce(createSelectBuilder([listItemRow()]) as never)

		vi.mocked(db.insert)
			.mockReturnValueOnce(
				createInsertBuilder([
					listRow({ id: 'created-list', icon: 'lucide:book', position: 2 })
				]) as never
			)
			.mockReturnValueOnce(
				createInsertBuilder([listItemRow({ id: 'created-item', position: 3 })]) as never
			)

		vi.mocked(db.update)
			.mockReturnValueOnce(createUpdateBuilder([{ id: 'list-1', position: 0 }]) as never)
			.mockReturnValueOnce(
				createUpdateBuilder([listRow({ name: 'Updated', icon: 'lucide:list' })]) as never
			)
			.mockReturnValueOnce(
				createUpdateBuilder([listRow({ status: 'archived', archivedAt: 10 })]) as never
			)
			.mockReturnValueOnce(
				createUpdateBuilder([listRow({ status: 'deleted', deletedAt: 11 })]) as never
			)
			.mockReturnValueOnce(createUpdateBuilder([{ id: 'li-1' }, { id: 'li-2' }]) as never)
			.mockReturnValueOnce(createUpdateBuilder([{ id: 'li-1' }]) as never)
			.mockReturnValueOnce(createUpdateBuilder([{ id: 'li-1', position: 0 }]) as never)
			.mockReturnValueOnce(
				createUpdateBuilder([listItemRow({ note: 'Two', updatedAt: 12 })]) as never
			)
			.mockReturnValueOnce(
				createUpdateBuilder([listItemRow({ status: 'checked', checkedAt: 13 })]) as never
			)
			.mockReturnValueOnce(
				createUpdateBuilder([
					listItemRow({ status: 'unchecked', checkedAt: null })
				]) as never
			)
			.mockReturnValueOnce(
				createUpdateBuilder([listItemRow({ status: 'deleted', deletedAt: 14 })]) as never
			)

		await expect(getCurrentUser(1)).resolves.toEqual({
			user: { id: '1', username: 'admin@example.com', displayName: 'Admin' }
		})
		await expect(listShoppingLists('active')).resolves.toMatchObject({
			lists: [{ id: 'list-1' }]
		})
		await expect(
			createShoppingList({ name: 'New', icon: 'lucide:book' }, 1)
		).resolves.toMatchObject({
			list: { id: 'created-list', icon: 'lucide:book' }
		})
		await expect(reorderShoppingLists(['list-1'], 1)).resolves.toEqual({
			lists: [{ id: 'list-1', position: 0 }]
		})
		await expect(getShoppingList('list-1')).resolves.toMatchObject({
			list: { id: 'list-1', items: [{ id: 'li-1' }] }
		})
		await expect(
			updateShoppingList('list-1', { name: 'Updated', icon: 'lucide:list' }, 1)
		).resolves.toMatchObject({
			list: { name: 'Updated', icon: 'lucide:list' }
		})
		await expect(archiveShoppingList('list-1', 1)).resolves.toMatchObject({
			list: { status: 'archived' }
		})
		await expect(deleteShoppingList('list-1', 1)).resolves.toMatchObject({
			list: { status: 'deleted' }
		})
		await expect(clearShoppingList('list-1', 1)).resolves.toEqual({ archivedCount: 2 })
		await expect(clearCheckedListItems('list-1', 1)).resolves.toEqual({ archivedCount: 1 })
		await expect(addListItem('list-1', { name: 'Milk' }, 1)).resolves.toMatchObject({
			listItem: { id: 'created-item' }
		})
		await expect(reorderListItems('list-1', ['li-1'], 1)).resolves.toEqual({
			items: [{ id: 'li-1', position: 0 }]
		})
		await expect(updateListItem('li-1', { note: 'Two' }, 1)).resolves.toMatchObject({
			listItem: { note: 'Two' }
		})
		await expect(checkListItem('li-1', 1)).resolves.toMatchObject({
			listItem: { status: 'checked' }
		})
		await expect(uncheckListItem('li-1', 1)).resolves.toMatchObject({
			listItem: { status: 'unchecked' }
		})
		await expect(deleteListItem('li-1', 1)).resolves.toMatchObject({
			listItem: { status: 'deleted' }
		})
	})

	it('reorders categorized list items with named and uncategorized groups', async () => {
		vi.mocked(db.select)
			.mockReturnValueOnce(
				createSelectBuilder([
					listRow({ householdId: 'household', uncategorizedCategoryPosition: 7 })
				]) as never
			)
			.mockReturnValueOnce(
				createSelectBuilder([categoryRow({ id: 'produce', householdId: 'household' })]) as never
			)
			.mockReturnValueOnce(
				createSelectBuilder([
					listCategoryPositionRow({
						id: 'lcp-1',
						householdId: 'household',
						listId: 'list-1',
						categoryId: 'produce',
						position: 5
					})
				]) as never
			)

		vi.mocked(db.update)
			.mockReturnValueOnce(
				createUpdateBuilder([
					listCategoryPositionRow({
						id: 'lcp-1',
						householdId: 'household',
						listId: 'list-1',
						categoryId: 'produce',
						position: 0
					})
				]) as never
			)
			.mockReturnValueOnce(
				createUpdateBuilder([
					listItemRow({ id: 'li-1', categoryId: 'produce', position: 0 })
				]) as never
			)
			.mockReturnValueOnce(
				createUpdateBuilder([
					listRow({ householdId: 'household', uncategorizedCategoryPosition: 1 })
				]) as never
			)
			.mockReturnValueOnce(
				createUpdateBuilder([
					listItemRow({ id: 'li-2', categoryId: null, position: 1 })
				]) as never
			)

		await expect(
			reorderCategorizedListItems(
				'household',
				'list-1',
				[
					{ categoryId: 'produce', orderedIds: ['li-1'] },
					{ categoryId: null, orderedIds: ['li-2'] }
				],
				1
			)
		).resolves.toMatchObject({
			items: [
				{ id: 'li-1', categoryId: 'produce', position: 0, categoryPosition: 0 },
				{ id: 'li-2', categoryId: null, position: 1, categoryPosition: 1 }
			]
		})
	})

	it('adds list items with created category positions and persisted uncategorized position', async () => {
		mocks.findOrCreateItem
			.mockResolvedValueOnce(itemRow({ id: 'item-1', categoryId: 'produce' }))
			.mockResolvedValueOnce(itemRow({ id: 'item-2', categoryId: null }))

		vi.mocked(db.select)
			.mockReturnValueOnce(
				createSelectBuilder([
					listRow({ householdId: 'household', uncategorizedCategoryPosition: 9 })
				]) as never
			)
			.mockReturnValueOnce(
				createSelectBuilder([categoryRow({ id: 'produce', householdId: 'household' })]) as never
			)
			.mockReturnValueOnce(createSelectBuilder([{ position: 3 }]) as never)
			.mockReturnValueOnce(createSelectBuilder([]) as never)
			.mockReturnValueOnce(createSelectBuilder([{ position: 4 }]) as never)
			.mockReturnValueOnce(
				createSelectBuilder([
					listRow({ householdId: 'household', uncategorizedCategoryPosition: 9 })
				]) as never
			)
			.mockReturnValueOnce(createSelectBuilder([{ position: 4 }]) as never)

		vi.mocked(db.insert)
			.mockReturnValueOnce(
				createInsertBuilder([
					listCategoryPositionRow({
						id: 'lcp-2',
						householdId: 'household',
						listId: 'list-1',
						categoryId: 'produce',
						position: 5
					})
				]) as never
			)
			.mockReturnValueOnce(
				createInsertBuilder([
					listItemRow({
						id: 'li-categorized',
						listId: 'list-1',
						itemId: 'item-1',
						categoryId: 'produce',
						position: 4
					})
				]) as never
			)
			.mockReturnValueOnce(
				createInsertBuilder([
					listItemRow({
						id: 'li-default',
						listId: 'list-1',
						itemId: 'item-2',
						categoryId: null,
						position: 5
					})
				]) as never
			)

		await expect(
			addListItem('household', 'list-1', { name: 'Tomaat', categoryId: 'produce' }, 1)
		).resolves.toMatchObject({
			listItem: { id: 'li-categorized', categoryId: 'produce', categoryPosition: 5 }
		})

		await expect(addListItem('household', 'list-1', { name: 'Water' }, 1)).resolves.toMatchObject(
			{
				listItem: { id: 'li-default', categoryId: undefined, categoryPosition: 9 }
			}
		)
	})

	it('updates list items when moving to another list without a category', async () => {
		mocks.findOrCreateItem.mockResolvedValueOnce(itemRow({ id: 'item-9', categoryId: null }))

		vi.mocked(db.select)
			.mockReturnValueOnce(
				createSelectBuilder([
					listItemRow({ id: 'li-9', listId: 'list-1', itemId: 'item-1', categoryId: 'produce' })
				]) as never
			)
			.mockReturnValueOnce(
				createSelectBuilder([
					listRow({ id: 'list-2', householdId: 'household', uncategorizedCategoryPosition: 4 })
				]) as never
			)
			.mockReturnValueOnce(createSelectBuilder([{ position: 6 }]) as never)

		vi.mocked(db.update).mockReturnValueOnce(
				createUpdateBuilder([
					listItemRow({
						id: 'li-9',
						listId: 'list-2',
						itemId: 'item-9',
						categoryId: null,
						position: 7,
						amount: 2,
						unit: null,
						note: 'Verplaatst'
					})
				]) as never
		)

		await expect(
			updateListItem(
				'household',
				'li-9',
				{
					listId: 'list-2',
					name: 'Melk',
					categoryId: null,
					amount: 2,
					note: 'Verplaatst'
				},
				1
			)
		).resolves.toMatchObject({
			listItem: {
				id: 'li-9',
				listId: 'list-2',
				itemId: 'item-9',
				categoryId: undefined,
				categoryPosition: 4,
				amount: 2,
				unit: undefined,
				note: 'Verplaatst'
			}
		})
	})

	it('prevents deleting the final remaining list', async () => {
		vi.mocked(db.select)
			.mockReturnValueOnce(createSelectBuilder([listRow()]) as never)
			.mockReturnValueOnce(createSelectBuilder([{ count: 1 }]) as never)

		await expect(deleteShoppingList('list-1', 1)).rejects.toThrow(
			'Minimaal één lijst moet behouden blijven.'
		)
	})

	it('handles item search and suggestions', async () => {
		vi.mocked(db.select)
			.mockReturnValueOnce(
				createSelectBuilder([{ item: itemRow({ name: 'Milk' }), category: null }]) as never
			)
			.mockReturnValueOnce(
				createSelectBuilder([
					{
						listItem: listItemRow({ archivedAt: 20, status: 'archived' }),
						item: itemRow({ id: 'item-1' })
					},
					{
						listItem: listItemRow({ archivedAt: 30, status: 'archived' }),
						item: itemRow({ id: 'item-1' })
					},
					{
						listItem: listItemRow({ archivedAt: 25, status: 'archived' }),
						item: itemRow({ id: 'item-2', name: 'Eggs' })
					}
				]) as never
			)

		await expect(searchItems({ q: 'milk', limit: 10 })).resolves.toEqual({
			items: [{ id: 'item-1', name: 'Milk', defaultUnit: undefined }]
		})
		const suggestions = await suggestItems({ limit: 10 })
		expect(suggestions.items[0]).toMatchObject({ id: 'item-1', usageCount: 2, lastUsedAt: 30 })
	})

	it('handles recipe workflows', async () => {
		vi.mocked(db.select)
			.mockReturnValueOnce(createSelectBuilder([recipeRow()]) as never)
			.mockReturnValueOnce(createSelectBuilder([recipeRow()]) as never)
			.mockReturnValueOnce(
				createSelectBuilder([{ recipeItem: recipeItemRow(), item: itemRow() }]) as never
			)
			.mockReturnValueOnce(createSelectBuilder([recipeRow()]) as never)
			.mockReturnValueOnce(createSelectBuilder([recipeRow()]) as never)
			.mockReturnValueOnce(createSelectBuilder([recipeRow()]) as never)
			.mockReturnValueOnce(createSelectBuilder([recipeRow()]) as never)
			.mockReturnValueOnce(createSelectBuilder([{ position: 0 }]) as never)
			.mockReturnValueOnce(createSelectBuilder([recipeRow()]) as never)
			.mockReturnValueOnce(createSelectBuilder([recipeRow()]) as never)
			.mockReturnValueOnce(createSelectBuilder([listRow()]) as never)
			.mockReturnValueOnce(
				createSelectBuilder([{ recipeItem: recipeItemRow(), item: itemRow() }]) as never
			)
			.mockReturnValueOnce(createSelectBuilder([{ position: 0 }]) as never)
			.mockReturnValueOnce(createSelectBuilder([recipeItemRow()]) as never)
			.mockReturnValueOnce(createSelectBuilder([recipeItemRow()]) as never)

		vi.mocked(db.insert)
			.mockReturnValueOnce(
				createInsertBuilder([recipeRow({ id: 'recipe-created' })]) as never
			)
			.mockReturnValueOnce(
				createInsertBuilder([recipeItemRow({ id: 'ri-created' })]) as never
			)
			.mockReturnValueOnce(createInsertBuilder([recipeItemRow({ id: 'ri-added' })]) as never)
			.mockReturnValueOnce(createInsertBuilder([listItemRow({ id: 'li-copy' })]) as never)

		vi.mocked(db.update)
			.mockReturnValueOnce(createUpdateBuilder([recipeRow({ updatedAt: 30 })]) as never)
			.mockReturnValueOnce(
				createUpdateBuilder([recipeRow({ status: 'archived', archivedAt: 31 })]) as never
			)
			.mockReturnValueOnce(
				createUpdateBuilder([recipeRow({ status: 'deleted', deletedAt: 32 })]) as never
			)
			.mockReturnValueOnce(createUpdateBuilder([{ id: 'ri-1', position: 0 }]) as never)
			.mockReturnValueOnce(createUpdateBuilder([recipeItemRow({ updatedAt: 33 })]) as never)

		vi.mocked(db.delete).mockReturnValue(createDeleteBuilder() as never)

		await expect(listRecipes({ status: 'active' })).resolves.toMatchObject({
			recipes: [{ id: 'recipe-1' }]
		})
		await expect(
			createRecipe({ name: 'Pasta', items: [{ name: 'Milk' }] }, 1)
		).resolves.toMatchObject({
			recipe: { id: 'recipe-created', items: [{ id: 'ri-created' }] }
		})
		await expect(getRecipe('recipe-1')).resolves.toMatchObject({
			recipe: { id: 'recipe-1', items: [{ id: 'ri-1' }] }
		})
		await expect(updateRecipe('recipe-1', { name: 'New' }, 1)).resolves.toEqual({
			recipe: { id: 'recipe-1', updatedAt: 30 }
		})
		await expect(archiveRecipe('recipe-1', 1)).resolves.toMatchObject({
			recipe: { status: 'archived' }
		})
		await expect(deleteRecipe('recipe-1', 1)).resolves.toMatchObject({
			recipe: { status: 'deleted' }
		})
		await expect(addRecipeItem('recipe-1', { name: 'Milk' }, 1)).resolves.toMatchObject({
			recipeItem: { id: 'ri-added' }
		})
		await expect(reorderRecipeItems('recipe-1', ['ri-1'], 1)).resolves.toEqual({
			items: [{ id: 'ri-1', position: 0 }]
		})
		await expect(addRecipeToList('recipe-1', 'list-1', 1)).resolves.toMatchObject({
			addedItems: [{ id: 'li-copy' }]
		})
		await expect(updateRecipeItem('ri-1', { note: 'Updated' }, 1)).resolves.toEqual({
			recipeItem: { id: 'ri-1', updatedAt: 33 }
		})
		await expect(deleteRecipeItem('ri-1')).resolves.toEqual({ ok: true })
	})

	it('handles meal planner workflows', async () => {
		const days = [
			mealPlannerDayRow({ id: 'day-1', dayOfWeek: 1, type: 'recipe', recipeId: 'recipe-1' }),
			mealPlannerDayRow({
				id: 'day-2',
				dayOfWeek: 2,
				type: 'placeholder',
				placeholderName: 'Soup'
			}),
			...Array.from({ length: 5 }, (_, index) =>
				mealPlannerDayRow({ id: `day-${index + 3}`, dayOfWeek: index + 3 })
			)
		]

		vi.mocked(db.select)
			.mockReturnValueOnce(createSelectBuilder(days) as never)
			.mockReturnValueOnce(createSelectBuilder([recipeRow()]) as never)
			.mockReturnValueOnce(
				createSelectBuilder([
					{ dayItem: mealPlannerDayItemRow(), item: itemRow() }
				]) as never
			)
			.mockReturnValueOnce(createSelectBuilder([days[1]]) as never)
			.mockReturnValueOnce(createSelectBuilder([days[1]]) as never)
			.mockReturnValueOnce(createSelectBuilder([{ position: 0 }]) as never)
			.mockReturnValueOnce(createSelectBuilder([days[1]]) as never)
			.mockReturnValueOnce(createSelectBuilder([listRow()]) as never)
			.mockReturnValueOnce(createSelectBuilder(days) as never)
			.mockReturnValueOnce(
				createSelectBuilder([{ recipeItem: recipeItemRow(), item: itemRow() }]) as never
			)
			.mockReturnValueOnce(createSelectBuilder([{ position: 0 }]) as never)
			.mockReturnValueOnce(
				createSelectBuilder([
					{
						dayItem: mealPlannerDayItemRow(),
						item: itemRow({ id: 'item-2', name: 'Eggs' })
					}
				]) as never
			)
			.mockReturnValueOnce(createSelectBuilder([{ position: 1 }]) as never)
			.mockReturnValueOnce(createSelectBuilder([mealPlannerDayItemRow()]) as never)
			.mockReturnValueOnce(createSelectBuilder([mealPlannerDayItemRow()]) as never)

		vi.mocked(db.insert)
			.mockReturnValueOnce(
				createInsertBuilder([mealPlannerDayItemRow({ id: 'mdi-new' })]) as never
			)
			.mockReturnValueOnce(createInsertBuilder([listItemRow({ id: 'li-plan-1' })]) as never)
			.mockReturnValueOnce(
				createInsertBuilder([
					listItemRow({
						id: 'li-plan-2',
						itemId: 'item-2',
						sourceType: 'meal_planner_placeholder'
					})
				]) as never
			)

		vi.mocked(db.update)
			.mockReturnValueOnce(
				createUpdateBuilder([
					mealPlannerDayRow({
						id: 'day-2',
						dayOfWeek: 2,
						type: 'placeholder',
						placeholderName: 'Soup'
					})
				]) as never
			)
			.mockReturnValueOnce(createUpdateBuilder([{ id: 'mdi-1', position: 0 }]) as never)
			.mockReturnValueOnce(createUpdateBuilder([{ id: 'day-1' }, { id: 'day-2' }]) as never)
			.mockReturnValueOnce(
				createUpdateBuilder([mealPlannerDayItemRow({ updatedAt: 40 })]) as never
			)

		vi.mocked(db.delete).mockReturnValue(createDeleteBuilder() as never)

		const mealPlanner = await getMealPlanner(1)
		expect(mealPlanner.days).toHaveLength(7)
		expect(mealPlanner.days[0]).toMatchObject({ id: 'day-1', recipe: { id: 'recipe-1' } })
		await expect(
			updateMealPlannerDay(2, { type: 'placeholder', placeholderName: 'Soup' }, 1)
		).resolves.toMatchObject({
			day: { type: 'placeholder', placeholderName: 'Soup' }
		})
		await expect(addMealPlannerDayItem(2, { name: 'Milk' }, 1)).resolves.toMatchObject({
			mealPlannerDayItem: { id: 'mdi-new' }
		})
		await expect(reorderMealPlannerDayItems(2, ['mdi-1'], 1)).resolves.toEqual({
			items: [{ id: 'mdi-1', position: 0 }]
		})
		await expect(addMealPlannerToList('list-1', 1)).resolves.toMatchObject({
			addedItems: [{ id: 'li-plan-1' }, { id: 'li-plan-2' }]
		})
		await expect(clearMealPlanner(1)).resolves.toEqual({ clearedDays: 2 })
		await expect(updateMealPlannerDayItem('mdi-1', { note: 'Updated' }, 1)).resolves.toEqual({
			mealPlannerDayItem: { id: 'mdi-1', updatedAt: 40 }
		})
		await expect(deleteMealPlannerDayItem('mdi-1')).resolves.toEqual({ ok: true })
	})

	it('handles household-scoped domain call signatures directly', async () => {
		vi.mocked(db.select)
			.mockReturnValueOnce(createSelectBuilder([listRow({ id: 'list-1' })]) as never)
			.mockReturnValueOnce(createSelectBuilder([{ position: 2 }]) as never)
			.mockReturnValueOnce(createSelectBuilder([listRow({ id: 'list-1' })]) as never)
			.mockReturnValueOnce(createSelectBuilder([]) as never)
			.mockReturnValueOnce(createSelectBuilder([listRow({ id: 'list-1' })]) as never)
			.mockReturnValueOnce(createSelectBuilder([recipeRow({ id: 'recipe-1' })]) as never)
			.mockReturnValueOnce(createSelectBuilder([recipeRow({ id: 'recipe-1' })]) as never)
			.mockReturnValueOnce(createSelectBuilder([]) as never)
			.mockReturnValueOnce(createSelectBuilder([recipeRow({ id: 'recipe-1' })]) as never)
			.mockReturnValueOnce(createSelectBuilder([recipeRow({ id: 'recipe-1' })]) as never)
			.mockReturnValueOnce(
				createSelectBuilder([
					mealPlannerDayRow({ id: 'day-1', dayOfWeek: 1, type: 'placeholder' })
				]) as never
			)
			.mockReturnValueOnce(
				createSelectBuilder([
					mealPlannerDayRow({ id: 'day-1', dayOfWeek: 1, type: 'placeholder' })
				]) as never
			)

		vi.mocked(db.insert)
			.mockReturnValueOnce(createInsertBuilder([listRow({ id: 'created-list' })]) as never)
			.mockReturnValueOnce(
				createInsertBuilder([recipeRow({ id: 'created-recipe' })]) as never
			)

		vi.mocked(db.update)
			.mockReturnValueOnce(createUpdateBuilder([{ id: 'list-1', position: 0 }]) as never)
			.mockReturnValueOnce(createUpdateBuilder([]) as never)
			.mockReturnValueOnce(createUpdateBuilder([listRow({ id: 'list-1' })]) as never)
			.mockReturnValueOnce(
				createUpdateBuilder([recipeRow({ id: 'recipe-1', updatedAt: 9 })]) as never
			)
			.mockReturnValueOnce(createUpdateBuilder([{ id: 'ri-1', position: 0 }]) as never)
			.mockReturnValueOnce(createUpdateBuilder([]) as never)
			.mockReturnValueOnce(
				createUpdateBuilder([
					mealPlannerDayRow({
						id: 'day-1',
						dayOfWeek: 1,
						type: 'placeholder',
						placeholderName: 'Restjes'
					})
				]) as never
			)
			.mockReturnValueOnce(createUpdateBuilder([{ id: 'mdi-1', position: 0 }]) as never)
			.mockReturnValueOnce(createUpdateBuilder([]) as never)
			.mockReturnValueOnce(createUpdateBuilder([{ id: 'day-1' }, { id: 'day-2' }]) as never)
		vi.mocked(db.delete).mockReturnValue(createDeleteBuilder() as never)

		await expect(listShoppingLists('household', 'active')).resolves.toMatchObject({
			lists: [{ id: 'list-1' }]
		})
		await expect(createShoppingList('household', { name: 'New' }, 1)).resolves.toMatchObject({
			list: { id: 'created-list' }
		})
		await expect(reorderShoppingLists('household', ['list-1', 'missing'], 1)).resolves.toEqual({
			lists: [{ id: 'list-1', position: 0 }]
		})
		await expect(getShoppingList('household', 'list-1')).resolves.toMatchObject({
			list: { id: 'list-1', items: [] }
		})
		await expect(updateShoppingList('household', 'list-1', {}, 1)).resolves.toMatchObject({
			list: { id: 'list-1' }
		})
		await expect(listRecipes('household', { status: 'active' })).resolves.toMatchObject({
			recipes: [{ id: 'recipe-1' }]
		})
		await expect(createRecipe('household', { name: 'Pasta' }, 1)).resolves.toMatchObject({
			recipe: { id: 'created-recipe', items: [] }
		})
		await expect(getRecipe('household', 'recipe-1')).resolves.toMatchObject({
			recipe: { id: 'recipe-1', items: [] }
		})
		await expect(updateRecipe('household', 'recipe-1', {}, 1)).resolves.toEqual({
			recipe: { id: 'recipe-1', updatedAt: 9 }
		})
		await expect(
			reorderRecipeItems('household', 'recipe-1', ['ri-1', 'missing'], 1)
		).resolves.toEqual({
			items: [{ id: 'ri-1', position: 0 }]
		})
		await expect(
			updateMealPlannerDay(
				'household',
				1,
				{ type: 'placeholder', placeholderName: 'Restjes' },
				1
			)
		).resolves.toMatchObject({
			day: { id: 'day-1', placeholderName: 'Restjes' }
		})
		await expect(
			reorderMealPlannerDayItems('household', 1, ['mdi-1', 'missing'], 1)
		).resolves.toEqual({
			items: [{ id: 'mdi-1', position: 0 }]
		})
		await expect(clearMealPlanner('household', 1)).resolves.toEqual({ clearedDays: 2 })
	})
})

function listRow(overrides: Partial<Record<string, unknown>> = {}) {
	return {
		id: 'list-1',
		householdId: 'household',
		name: 'Groceries',
		icon: null,
		status: 'active',
		position: 0,
		uncategorizedCategoryPosition: 2147483647,
		archivedAt: null,
		deletedAt: null,
		createdAt: 1,
		updatedAt: 2,
		createdByUserId: 1,
		updatedByUserId: 1,
		...overrides
	}
}

function categoryRow(overrides: Partial<Record<string, unknown>> = {}) {
	return {
		id: 'produce',
		householdId: 'household',
		name: 'Groente',
		normalizedName: 'groente',
		createdAt: 1,
		updatedAt: 2,
		createdByUserId: 1,
		updatedByUserId: 1,
		...overrides
	}
}

function listCategoryPositionRow(overrides: Partial<Record<string, unknown>> = {}) {
	return {
		id: 'lcp-1',
		householdId: 'household',
		listId: 'list-1',
		categoryId: 'produce',
		position: 0,
		createdAt: 1,
		updatedAt: 2,
		createdByUserId: 1,
		updatedByUserId: 1,
		...overrides
	}
}

function itemRow(overrides: Partial<Record<string, unknown>> = {}) {
	return {
		id: 'item-1',
		name: 'Milk',
		normalizedName: 'milk',
		defaultUnit: null,
		createdAt: 1,
		updatedAt: 2,
		createdByUserId: 1,
		updatedByUserId: 1,
		...overrides
	}
}

function listItemRow(overrides: Partial<Record<string, unknown>> = {}) {
	return {
		id: 'li-1',
		listId: 'list-1',
		itemId: 'item-1',
		status: 'unchecked',
		position: 0,
		amount: null,
		unit: null,
		note: null,
		sourceType: 'manual',
		sourceRecipeId: null,
		sourceMealPlannerDayId: null,
		checkedAt: null,
		checkedByUserId: null,
		archivedAt: null,
		archivedByUserId: null,
		deletedAt: null,
		deletedByUserId: null,
		createdAt: 1,
		updatedAt: 2,
		createdByUserId: 1,
		updatedByUserId: 1,
		...overrides
	}
}

function recipeRow(overrides: Partial<Record<string, unknown>> = {}) {
	return {
		id: 'recipe-1',
		name: 'Pasta',
		description: null,
		servings: null,
		sourceUrl: null,
		status: 'active',
		archivedAt: null,
		deletedAt: null,
		createdAt: 1,
		updatedAt: 2,
		createdByUserId: 1,
		updatedByUserId: 1,
		...overrides
	}
}

function recipeItemRow(overrides: Partial<Record<string, unknown>> = {}) {
	return {
		id: 'ri-1',
		recipeId: 'recipe-1',
		itemId: 'item-1',
		amount: null,
		unit: null,
		note: null,
		position: 0,
		createdAt: 1,
		updatedAt: 2,
		createdByUserId: 1,
		updatedByUserId: 1,
		...overrides
	}
}

function mealPlannerDayRow(overrides: Partial<Record<string, unknown>> = {}) {
	return {
		id: 'day-1',
		dayOfWeek: 1,
		type: 'empty',
		recipeId: null,
		placeholderName: null,
		placeholderNotes: null,
		createdAt: 1,
		updatedAt: 2,
		createdByUserId: 1,
		updatedByUserId: 1,
		...overrides
	}
}

function mealPlannerDayItemRow(overrides: Partial<Record<string, unknown>> = {}) {
	return {
		id: 'mdi-1',
		mealPlannerDayId: 'day-2',
		itemId: 'item-1',
		amount: null,
		unit: null,
		note: null,
		position: 0,
		createdAt: 1,
		updatedAt: 2,
		createdByUserId: 1,
		updatedByUserId: 1,
		...overrides
	}
}
