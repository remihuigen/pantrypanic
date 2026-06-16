import { db } from 'hub:db'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
	createItemCategory,
	deleteItemCategory,
	findCategoryOrThrow,
	listItemCategories,
	mergeItemCategory,
	normalizeCategoryName,
	updateItemCategory
} from '../../server/domains'
import {
	createDeleteBuilder,
	createInsertBuilder,
	createSelectBuilder,
	createUpdateBuilder
} from './test-db'

const mocks = vi.hoisted(() => ({
	createDomainId: vi.fn(() => 'category-new')
}))

vi.mock('#server/utils/api-helpers', () => ({
	createDomainId: mocks.createDomainId
}))

describe('category domain helpers', () => {
	beforeEach(() => {
		vi.mocked(db.select).mockReset()
		vi.mocked(db.insert).mockReset()
		vi.mocked(db.update).mockReset()
		vi.mocked(db.delete).mockReset()
		mocks.createDomainId.mockClear()
	})

	it('normalizes category names', () => {
		expect(normalizeCategoryName('  Verse   Groente  ')).toBe('verse groente')
	})

	it('lists item categories with combined usage counts', async () => {
		vi.mocked(db.select)
			.mockReturnValueOnce(
				createSelectBuilder([
					categoryRow({ id: 'cat-1', name: 'Groente', normalizedName: 'groente' }),
					categoryRow({ id: 'cat-2', name: 'Fruit', normalizedName: 'fruit' }),
					categoryRow({ id: 'cat-3', name: 'Kruiden', normalizedName: 'kruiden' })
				]) as never
			)
			.mockReturnValueOnce(
				createSelectBuilder([
					{ categoryId: 'cat-1', count: 2 },
					{ categoryId: null, count: 99 }
				]) as never
			)
			.mockReturnValueOnce(
				createSelectBuilder([
					{ categoryId: 'cat-1', count: 3 },
					{ categoryId: 'cat-2', count: 1 },
					{ categoryId: null, count: 4 }
				]) as never
			)

		await expect(listItemCategories('household', { q: 'groe' })).resolves.toEqual({
			categories: [
				{
					id: 'cat-1',
					name: 'Groente',
					updatedAt: 2,
					usageCount: 5,
					itemUsageCount: 2,
					listItemUsageCount: 3
				},
				{
					id: 'cat-2',
					name: 'Fruit',
					updatedAt: 2,
					usageCount: 1,
					itemUsageCount: 0,
					listItemUsageCount: 1
				},
				{
					id: 'cat-3',
					name: 'Kruiden',
					updatedAt: 2,
					usageCount: 0,
					itemUsageCount: 0,
					listItemUsageCount: 0
				}
			]
		})
	})

	it('creates item categories and rejects duplicate names', async () => {
		vi.mocked(db.select)
			.mockReturnValueOnce(createSelectBuilder([]) as never)
			.mockReturnValueOnce(createSelectBuilder([{ id: 'duplicate' }]) as never)
		vi.mocked(db.insert).mockReturnValueOnce(
			createInsertBuilder([categoryRow({ id: 'category-new', name: 'Zuivel' })]) as never
		)

		await expect(createItemCategory('household', { name: 'Zuivel' }, 1)).resolves.toEqual({
			category: { id: 'category-new', name: 'Zuivel', updatedAt: 2 }
		})

		await expect(createItemCategory('household', { name: 'Zuivel' }, 1)).rejects.toThrow(
			'Er bestaat al een categorie met deze naam.'
		)
	})

	it('updates categories for unchanged, renamed, and duplicate-name paths', async () => {
		vi.mocked(db.select)
			.mockReturnValueOnce(
				createSelectBuilder([
					categoryRow({ id: 'cat-1', name: 'Groente', normalizedName: 'groente' })
				]) as never
			)
			.mockReturnValueOnce(
				createSelectBuilder([
					categoryRow({ id: 'cat-2', name: 'Fruit', normalizedName: 'fruit' })
				]) as never
			)
			.mockReturnValueOnce(createSelectBuilder([]) as never)
			.mockReturnValueOnce(
				createSelectBuilder([
					categoryRow({ id: 'cat-3', name: 'Dranken', normalizedName: 'dranken' })
				]) as never
			)
			.mockReturnValueOnce(createSelectBuilder([{ id: 'duplicate' }]) as never)

		vi.mocked(db.update)
			.mockReturnValueOnce(
				createUpdateBuilder([categoryRow({ id: 'cat-1', name: 'Groente' })]) as never
			)
			.mockReturnValueOnce(
				createUpdateBuilder([
					categoryRow({ id: 'cat-2', name: 'Vers fruit', normalizedName: 'vers fruit' })
				]) as never
			)

		await expect(updateItemCategory('household', 'cat-1', {}, 1)).resolves.toEqual({
			category: { id: 'cat-1', name: 'Groente', updatedAt: 2 }
		})

		await expect(
			updateItemCategory('household', 'cat-2', { name: 'Vers fruit' }, 1)
		).resolves.toEqual({
			category: { id: 'cat-2', name: 'Vers fruit', updatedAt: 2 }
		})

		await expect(
			updateItemCategory('household', 'cat-3', { name: 'Zuivel' }, 1)
		).rejects.toThrow('Er bestaat al een categorie met deze naam.')
	})

	it('merges categories and guards against self-merge', async () => {
		await expect(
			mergeItemCategory('household', 'cat-1', { targetCategoryId: 'cat-1' })
		).rejects.toThrow('Kies twee verschillende categorieën.')

		vi.mocked(db.select)
			.mockReturnValueOnce(createSelectBuilder([categoryRow({ id: 'cat-1' })]) as never)
			.mockReturnValueOnce(createSelectBuilder([categoryRow({ id: 'cat-2' })]) as never)
		vi.mocked(db.update)
			.mockReturnValueOnce(createUpdateBuilder() as never)
			.mockReturnValueOnce(createUpdateBuilder() as never)
		vi.mocked(db.delete)
			.mockReturnValueOnce(createDeleteBuilder() as never)
			.mockReturnValueOnce(createDeleteBuilder() as never)

		await expect(
			mergeItemCategory('household', 'cat-1', { targetCategoryId: 'cat-2' })
		).resolves.toEqual({
			mergedCategoryId: 'cat-1',
			targetCategoryId: 'cat-2'
		})
	})

	it('deletes categories and clears references', async () => {
		vi.mocked(db.select).mockReturnValueOnce(
			createSelectBuilder([categoryRow({ id: 'cat-1' })]) as never
		)
		vi.mocked(db.update)
			.mockReturnValueOnce(createUpdateBuilder() as never)
			.mockReturnValueOnce(createUpdateBuilder() as never)
		vi.mocked(db.delete)
			.mockReturnValueOnce(createDeleteBuilder() as never)
			.mockReturnValueOnce(createDeleteBuilder() as never)

		await expect(deleteItemCategory('household', 'cat-1')).resolves.toEqual({
			deletedCategoryId: 'cat-1'
		})
	})

	it('handles empty category lists and missing-category errors', async () => {
		vi.mocked(db.select)
			.mockReturnValueOnce(createSelectBuilder([]) as never)
			.mockReturnValueOnce(createSelectBuilder([]) as never)
			.mockReturnValueOnce(createSelectBuilder([]) as never)
			.mockReturnValueOnce(createSelectBuilder([]) as never)
			.mockReturnValueOnce(createSelectBuilder([]) as never)
			.mockReturnValueOnce(createSelectBuilder([]) as never)

		await expect(listItemCategories('household')).resolves.toEqual({ categories: [] })
		await expect(findCategoryOrThrow('household', 'missing')).rejects.toThrow(
			'Categorie niet gevonden.'
		)
		await expect(
			mergeItemCategory('household', 'missing', { targetCategoryId: 'cat-2' })
		).rejects.toThrow('Categorie niet gevonden.')
		await expect(deleteItemCategory('household', 'missing')).rejects.toThrow(
			'Categorie niet gevonden.'
		)
	})
})

function categoryRow(overrides: Partial<Record<string, unknown>> = {}) {
	return {
		id: 'cat-1',
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
