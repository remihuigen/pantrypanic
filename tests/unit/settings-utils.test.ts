import { db } from 'hub:db'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
	clearHouseholdData,
	deleteCanonicalItem,
	listAllItems,
	mergeCanonicalItem,
	updateCanonicalItem
} from '../../server/utils/settings'
import {
	createDeleteBuilder,
	createSelectBuilder,
	createUpdateBuilder
} from './test-db'

const mocks = vi.hoisted(() => ({
	seedInitialDomainData: vi.fn()
}))

vi.mock('#server/utils/domains/seed', () => ({
	seedInitialDomainData: mocks.seedInitialDomainData
}))

describe('settings utilities', () => {
	beforeEach(() => {
		vi.mocked(db.select).mockReset()
		vi.mocked(db.update).mockReset()
		vi.mocked(db.delete).mockReset()
		mocks.seedInitialDomainData.mockClear()
	})

	it('clears only household domain data and reseeds the default list and planner days', async () => {
		vi.mocked(db.delete).mockReturnValue(createDeleteBuilder([]) as never)

		await expect(clearHouseholdData('household', 12)).resolves.toEqual({ ok: true })

		expect(db.delete).toHaveBeenCalledTimes(7)
		expect(mocks.seedInitialDomainData).toHaveBeenCalledWith(12, 'household')
	})

	it('aggregates item usage across lists, recipes, and meal-planner rows', async () => {
		vi.mocked(db.select)
			.mockReturnValueOnce(
				createSelectBuilder([itemRow({ id: 'milk' }), itemRow({ id: 'bread' })]) as never
			)
			.mockReturnValueOnce(createSelectBuilder([{ itemId: 'milk', count: 2 }]) as never)
			.mockReturnValueOnce(createSelectBuilder([{ itemId: 'milk', count: 3 }]) as never)
			.mockReturnValueOnce(createSelectBuilder([{ itemId: 'bread', count: 1 }]) as never)

		await expect(listAllItems('household', {})).resolves.toMatchObject({
			items: [
				{ id: 'milk', usageCount: 5 },
				{ id: 'bread', usageCount: 1 }
			]
		})
	})

	it('rejects canonical item rename collisions within the household', async () => {
		vi.mocked(db.select)
			.mockReturnValueOnce(createSelectBuilder([itemRow({ id: 'source' })]) as never)
			.mockReturnValueOnce(createSelectBuilder([{ id: 'duplicate' }]) as never)

		await expect(
			updateCanonicalItem('household', 'source', { name: 'Duplicate' }, 1)
		).rejects.toMatchObject({
			statusCode: 409,
			message: 'Er bestaat al een item met deze naam.'
		})
		expect(db.update).not.toHaveBeenCalled()
	})

	it('merges canonical items by reassigning all references and deleting the source item', async () => {
		vi.mocked(db.select)
			.mockReturnValueOnce(createSelectBuilder([itemRow({ id: 'source' })]) as never)
			.mockReturnValueOnce(createSelectBuilder([itemRow({ id: 'target' })]) as never)
		vi.mocked(db.update).mockReturnValue(createUpdateBuilder([]) as never)
		vi.mocked(db.delete).mockReturnValue(createDeleteBuilder([]) as never)

		await expect(mergeCanonicalItem('household', 'source', 'target')).resolves.toEqual({
			mergedItemId: 'source',
			targetItemId: 'target'
		})
		expect(db.update).toHaveBeenCalledTimes(3)
		expect(db.delete).toHaveBeenCalledTimes(1)
	})

	it('prevents deleting canonical items that are still referenced', async () => {
		vi.mocked(db.select)
			.mockReturnValueOnce(createSelectBuilder([itemRow({ id: 'milk' })]) as never)
			.mockReturnValueOnce(createSelectBuilder([{ count: 1 }]) as never)
			.mockReturnValueOnce(createSelectBuilder([{ count: 0 }]) as never)
			.mockReturnValueOnce(createSelectBuilder([{ count: 0 }]) as never)

		await expect(deleteCanonicalItem('household', 'milk')).rejects.toMatchObject({
			statusCode: 409,
			message: 'Dit item wordt nog gebruikt. Voeg het eerst samen of verwijder de verwijzingen.'
		})
		expect(db.delete).not.toHaveBeenCalled()
	})

	it('deletes unused canonical items', async () => {
		vi.mocked(db.select)
			.mockReturnValueOnce(createSelectBuilder([itemRow({ id: 'milk' })]) as never)
			.mockReturnValueOnce(createSelectBuilder([{ count: 0 }]) as never)
			.mockReturnValueOnce(createSelectBuilder([{ count: 0 }]) as never)
			.mockReturnValueOnce(createSelectBuilder([{ count: 0 }]) as never)
		vi.mocked(db.delete).mockReturnValueOnce(createDeleteBuilder([]) as never)

		await expect(deleteCanonicalItem('household', 'milk')).resolves.toEqual({
			deletedItemId: 'milk'
		})
		expect(db.delete).toHaveBeenCalledTimes(1)
	})
})

function itemRow(
	overrides: Partial<{
		id: string
		householdId: string
		name: string
		normalizedName: string
		defaultUnit: string | null
		category: string | null
		notes: string | null
		createdAt: number
		updatedAt: number
		createdByUserId: number
		updatedByUserId: number
	}> = {}
) {
	return {
		id: 'item',
		householdId: 'household',
		name: 'Milk',
		normalizedName: 'milk',
		defaultUnit: null,
		category: null,
		notes: null,
		createdAt: 1,
		updatedAt: 1,
		createdByUserId: 1,
		updatedByUserId: 1,
		...overrides
	}
}
