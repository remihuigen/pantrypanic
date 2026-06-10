import { beforeEach, describe, expect, it, vi } from 'vitest'

import { db } from 'hub:db'

import {
	defaultListName,
	findItemByNormalizedName,
	findOrCreateItem,
	getFirstUserIdForDomainSeed,
	mealPlannerDayNumbers,
	normalizeItemName,
	seedInitialDomainData
} from '../../server/utils/domain-data'
import { createInsertBuilder, createSelectBuilder } from './test-db'

vi.mock('#server/utils/domain-ids', () => ({
	createDomainId: vi.fn(() => 'domain-id')
}))

describe('domain data helpers', () => {
	beforeEach(() => {
		vi.mocked(db.select).mockReset()
		vi.mocked(db.insert).mockReset()
	})

	it('normalizes item names for canonical reuse', () => {
		expect(normalizeItemName('  Cherry   Tomatoes ')).toBe('cherry tomatoes')
		expect(normalizeItemName('MILK')).toBe('milk')
	})

	it('finds items by normalized name', async () => {
		const item = { id: 'item-1', normalizedName: 'milk' }
		vi.mocked(db.select).mockReturnValue(createSelectBuilder([item]) as never)

		await expect(findItemByNormalizedName('milk')).resolves.toBe(item)
	})

	it('reuses an existing canonical item', async () => {
		const item = { id: 'item-1', normalizedName: 'milk' }
		vi.mocked(db.select).mockReturnValue(createSelectBuilder([item]) as never)

		await expect(findOrCreateItem({ name: 'Milk', auditUserId: 1 })).resolves.toBe(item)

		expect(db.insert).not.toHaveBeenCalled()
	})

	it('creates a canonical item when one does not exist', async () => {
		const item = { id: 'domain-id', normalizedName: 'milk' }
		const insertBuilder = createInsertBuilder([item])
		vi.mocked(db.select).mockReturnValue(createSelectBuilder([]) as never)
		vi.mocked(db.insert).mockReturnValue(insertBuilder as never)

		await expect(
			findOrCreateItem({
				name: ' Milk ',
				defaultUnit: 'liter',
				category: 'Dairy',
				notes: 'Organic',
				auditUserId: 7
			})
		).resolves.toBe(item)
	})

	it('handles concurrent canonical item creation races', async () => {
		const item = { id: 'item-1', normalizedName: 'milk' }
		vi.mocked(db.select)
			.mockReturnValueOnce(createSelectBuilder([]) as never)
			.mockReturnValueOnce(createSelectBuilder([item]) as never)
		vi.mocked(db.insert).mockImplementation(() => {
			throw new Error('unique constraint')
		})

		await expect(findOrCreateItem({ name: 'Milk', auditUserId: 1 })).resolves.toBe(item)
	})

	it('rethrows failed canonical item creation when the item still does not exist', async () => {
		vi.mocked(db.select)
			.mockReturnValueOnce(createSelectBuilder([]) as never)
			.mockReturnValueOnce(createSelectBuilder([]) as never)
		vi.mocked(db.insert).mockImplementation(() => {
			throw new Error('database unavailable')
		})

		await expect(findOrCreateItem({ name: 'Milk', auditUserId: 1 })).rejects.toThrow('database unavailable')
	})

	it('seeds the default list and missing meal planner days', async () => {
		vi.mocked(db.select)
			.mockReturnValueOnce(createSelectBuilder([]) as never)
			.mockReturnValueOnce(createSelectBuilder([{ dayOfWeek: 1 }, { dayOfWeek: 7 }]) as never)
		vi.mocked(db.insert)
			.mockReturnValueOnce(createInsertBuilder([]) as never)
			.mockReturnValueOnce(createInsertBuilder([]) as never)

		await seedInitialDomainData(12)

		expect(db.insert).toHaveBeenCalledTimes(2)
	})

	it('skips seed inserts when rows already exist', async () => {
		vi.mocked(db.select)
			.mockReturnValueOnce(createSelectBuilder([{ id: 'list-1' }]) as never)
			.mockReturnValueOnce(
				createSelectBuilder(mealPlannerDayNumbers.map(dayOfWeek => ({ dayOfWeek }))) as never
			)

		await seedInitialDomainData(12)

		expect(db.insert).not.toHaveBeenCalled()
	})

	it('returns the first seed user id when one exists', async () => {
		vi.mocked(db.select).mockReturnValue(createSelectBuilder([{ id: 99 }]) as never)

		await expect(getFirstUserIdForDomainSeed()).resolves.toBe(99)
	})

	it('returns undefined when no seed user exists', async () => {
		vi.mocked(db.select).mockReturnValue(createSelectBuilder([]) as never)

		await expect(getFirstUserIdForDomainSeed()).resolves.toBeUndefined()
	})

	it('exposes the default seed list name', () => {
		expect(defaultListName).toBe('Groceries')
	})
})
