import { db } from 'hub:db'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
	findItemByNormalizedName,
	findOrCreateItem,
	normalizeItemName
} from '#server/utils/domains/items'
import { createInsertBuilder, createSelectBuilder } from '#tests/support/drizzle-builders'

vi.mock('#server/utils/api-helpers', () => ({
	createDomainId: vi.fn(() => 'domain-id')
}))

describe('server/utils/domains/items.ts', () => {
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
		vi.mocked(db.select).mockReturnValue(createSelectBuilder([]) as never)
		vi.mocked(db.insert).mockReturnValue(createInsertBuilder([item]) as never)

		await expect(
			findOrCreateItem({
				name: ' Milk ',
				defaultUnit: 'liter',
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

		await expect(findOrCreateItem({ name: 'Milk', auditUserId: 1 })).rejects.toThrow(
			'database unavailable'
		)
	})
})
