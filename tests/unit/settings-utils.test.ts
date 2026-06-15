import { db } from 'hub:db'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
	clearHouseholdData,
	deleteCanonicalItem,
	getHouseholdStats,
	getProfile,
	listAllItems,
	mergeCanonicalItem,
	updateCanonicalItem,
	updateProfile
} from '../../server/utils/settings'
import { createDeleteBuilder, createSelectBuilder, createUpdateBuilder } from './test-db'

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
		vi.stubGlobal(
			'hashPassword',
			vi.fn(async () => 'hashed-password')
		)
	})

	it('serializes user profiles and omits empty avatar paths', async () => {
		vi.mocked(db.select).mockReturnValueOnce(
			createSelectBuilder([
				userRow({ id: 4, name: 'Alex', email: 'alex@example.com', avatarPathname: null })
			]) as never
		)

		await expect(getProfile(4)).resolves.toEqual({
			user: {
				id: 4,
				name: 'Alex',
				email: 'alex@example.com',
				avatarPathname: undefined,
				createdAt: expect.any(Date)
			}
		})
	})

	it('throws when a profile cannot be found', async () => {
		vi.mocked(db.select).mockReturnValueOnce(createSelectBuilder([]) as never)

		await expect(getProfile(404)).rejects.toMatchObject({
			statusCode: 404,
			message: 'Gebruiker niet gevonden.'
		})
	})

	it('updates profile fields and hashes new passwords', async () => {
		let updateValues: unknown
		vi.mocked(db.select).mockReturnValueOnce(createSelectBuilder([]) as never)
		vi.mocked(db.update).mockReturnValueOnce(
			createCapturingUpdateBuilder(
				[
					userRow({
						name: 'Nieuw',
						email: 'nieuw@example.com',
						password: 'hashed-password',
						avatarPathname: null
					})
				],
				(values) => {
					updateValues = values
				}
			) as never
		)

		await expect(
			updateProfile(1, {
				name: 'Nieuw',
				email: 'nieuw@example.com',
				password: 'secret123',
				avatarPathname: null
			})
		).resolves.toMatchObject({
			user: {
				name: 'Nieuw',
				email: 'nieuw@example.com',
				avatarPathname: undefined
			}
		})
		expect(hashPassword).toHaveBeenCalledWith('secret123')
		expect(updateValues).toMatchObject({
			name: 'Nieuw',
			email: 'nieuw@example.com',
			password: 'hashed-password',
			avatarPathname: null
		})
	})

	it('rejects profile email collisions', async () => {
		vi.mocked(db.select).mockReturnValueOnce(createSelectBuilder([{ id: 2 }]) as never)

		await expect(updateProfile(1, { email: 'taken@example.com' })).rejects.toMatchObject({
			statusCode: 409,
			message: 'Dit e-mailadres is al in gebruik.'
		})
		expect(db.update).not.toHaveBeenCalled()
	})

	it('updates profile names without checking email or hashing passwords', async () => {
		let updateValues: unknown
		vi.mocked(db.update).mockReturnValueOnce(
			createCapturingUpdateBuilder([userRow({ name: 'Alleen naam' })], (values) => {
				updateValues = values
			}) as never
		)

		await expect(updateProfile(1, { name: 'Alleen naam' })).resolves.toMatchObject({
			user: { name: 'Alleen naam' }
		})
		expect(db.select).not.toHaveBeenCalled()
		expect(hashPassword).not.toHaveBeenCalled()
		expect(updateValues).toEqual({ name: 'Alleen naam' })
	})

	it('throws when a profile update affects no user row', async () => {
		vi.mocked(db.update).mockReturnValueOnce(createUpdateBuilder([]) as never)

		await expect(updateProfile(404, { name: 'Missing' })).rejects.toMatchObject({
			statusCode: 404,
			message: 'Gebruiker niet gevonden.'
		})
	})

	it('clears only household domain data and reseeds the default list and planner days', async () => {
		vi.mocked(db.delete).mockReturnValue(createDeleteBuilder([]) as never)

		await expect(clearHouseholdData('household', 12)).resolves.toEqual({ ok: true })

		expect(db.delete).toHaveBeenCalledTimes(9)
		expect(mocks.seedInitialDomainData).toHaveBeenCalledWith(12, 'household')
	})

	it('aggregates item usage across lists, recipes, and meal-planner rows', async () => {
		vi.mocked(db.select)
			.mockReturnValueOnce(
				createSelectBuilder([
					{ item: itemRow({ id: 'milk' }), category: null },
					{ item: itemRow({ id: 'bread' }), category: null }
				]) as never
			)
			.mockReturnValueOnce(
				createSelectBuilder([{ itemId: 'milk', status: 'checked', count: 2 }]) as never
			)
			.mockReturnValueOnce(createSelectBuilder([{ itemId: 'milk', count: 3 }]) as never)
			.mockReturnValueOnce(createSelectBuilder([{ itemId: 'bread', count: 1 }]) as never)

		await expect(listAllItems('household', {})).resolves.toMatchObject({
			items: [
				{ id: 'milk', usageCount: 5, activeListItemUsageCount: 2 },
				{ id: 'bread', usageCount: 1 }
			]
		})
	})

	it('filters all-items results by search query and serializes optional default unit', async () => {
		vi.mocked(db.select)
			.mockReturnValueOnce(
				createSelectBuilder([
					{
						item: itemRow({
							id: 'milk',
							defaultUnit: 'pak'
						}),
						category: null
					}
				]) as never
			)
			.mockReturnValueOnce(createSelectBuilder([]) as never)
			.mockReturnValueOnce(createSelectBuilder([]) as never)
			.mockReturnValueOnce(createSelectBuilder([]) as never)

		await expect(listAllItems('household', { q: 'Melk' })).resolves.toEqual({
			items: [
				expect.objectContaining({
					id: 'milk',
					defaultUnit: 'pak',
					usageCount: 0
				})
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

	it('updates canonical item metadata without duplicate lookup when the normalized name is unchanged', async () => {
		let updateValues: unknown
		vi.mocked(db.select).mockReturnValueOnce(
			createSelectBuilder([itemRow({ id: 'milk' })]) as never
		)
		vi.mocked(db.update).mockReturnValueOnce(
			createCapturingUpdateBuilder(
				[
					itemRow({
						id: 'milk',
						name: 'Milk',
						defaultUnit: 'pak',
						updatedByUserId: 7
					})
				],
				(values) => {
					updateValues = values
				}
			) as never
		)

		await expect(
			updateCanonicalItem('household', 'milk', { name: 'Milk', defaultUnit: 'pak' }, 7)
		).resolves.toMatchObject({
			item: {
				id: 'milk',
				defaultUnit: 'pak'
			}
		})
		expect(db.select).toHaveBeenCalledTimes(1)
		expect(updateValues).toMatchObject({
			name: 'Milk',
			normalizedName: 'milk',
			defaultUnit: 'pak',
			updatedByUserId: 7
		})
	})

	it('updates changed canonical item names when no duplicate exists', async () => {
		vi.mocked(db.select)
			.mockReturnValueOnce(createSelectBuilder([itemRow({ id: 'milk' })]) as never)
			.mockReturnValueOnce(createSelectBuilder([]) as never)
		vi.mocked(db.update).mockReturnValueOnce(
			createUpdateBuilder([
				itemRow({ id: 'milk', name: 'Halfvolle melk', normalizedName: 'halfvolle melk' })
			]) as never
		)

		await expect(
			updateCanonicalItem('household', 'milk', { name: 'Halfvolle melk' }, 1)
		).resolves.toMatchObject({
			item: {
				id: 'milk',
				name: 'Halfvolle melk',
				normalizedName: 'halfvolle melk'
			}
		})
	})

	it('throws when a canonical item cannot be found', async () => {
		vi.mocked(db.select).mockReturnValueOnce(createSelectBuilder([]) as never)

		await expect(
			updateCanonicalItem('household', 'missing', { name: 'Missing' }, 1)
		).rejects.toMatchObject({
			statusCode: 404,
			message: 'Item niet gevonden.'
		})
		expect(db.update).not.toHaveBeenCalled()
	})

	it('throws when canonical item updates return no row', async () => {
		vi.mocked(db.select).mockReturnValueOnce(
			createSelectBuilder([itemRow({ id: 'milk' })]) as never
		)
		vi.mocked(db.update).mockReturnValueOnce(createUpdateBuilder([]) as never)

		await expect(
			updateCanonicalItem('household', 'milk', { defaultUnit: null }, 1)
		).rejects.toMatchObject({
			statusCode: 500,
			message: 'Er is iets misgegaan.'
		})
	})

	it('rejects merging an item into itself', async () => {
		await expect(mergeCanonicalItem('household', 'milk', 'milk')).rejects.toMatchObject({
			statusCode: 409,
			message: 'Kies twee verschillende items.'
		})
		expect(db.select).not.toHaveBeenCalled()
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

	it('deletes canonical items and associated references', async () => {
		vi.mocked(db.select)
			.mockReturnValueOnce(createSelectBuilder([itemRow({ id: 'milk' })]) as never)
			.mockReturnValueOnce(createSelectBuilder([{ count: 2 }]) as never)
			.mockReturnValueOnce(createSelectBuilder([{ count: 1 }]) as never)
			.mockReturnValueOnce(createSelectBuilder([{ count: 3 }]) as never)
			.mockReturnValueOnce(createSelectBuilder([{ count: 4 }]) as never)
		vi.mocked(db.delete).mockReturnValue(createDeleteBuilder([]) as never)

		await expect(deleteCanonicalItem('household', 'milk')).resolves.toEqual({
			deletedItemId: 'milk',
			deletedListItems: 2,
			deletedRecipeItems: 3,
			deletedMealPlannerDayItems: 4
		})
		expect(db.delete).toHaveBeenCalledTimes(4)
	})

	it('deletes unused canonical items', async () => {
		vi.mocked(db.select)
			.mockReturnValueOnce(createSelectBuilder([itemRow({ id: 'milk' })]) as never)
			.mockReturnValueOnce(createSelectBuilder([{ count: 0 }]) as never)
			.mockReturnValueOnce(createSelectBuilder([{ count: 0 }]) as never)
			.mockReturnValueOnce(createSelectBuilder([{ count: 0 }]) as never)
			.mockReturnValueOnce(createSelectBuilder([{ count: 0 }]) as never)
		vi.mocked(db.delete).mockReturnValue(createDeleteBuilder([]) as never)

		await expect(deleteCanonicalItem('household', 'milk')).resolves.toEqual({
			deletedItemId: 'milk',
			deletedListItems: 0,
			deletedRecipeItems: 0,
			deletedMealPlannerDayItems: 0
		})
		expect(db.delete).toHaveBeenCalledTimes(4)
	})

	it('summarizes household usage stats with numeric fallbacks', async () => {
		vi.mocked(db.select)
			.mockReturnValueOnce(
				createSelectBuilder([{ lists: '2', items: '3', recipes: '4' }]) as never
			)
			.mockReturnValueOnce(createSelectBuilder([{ count: '12' }]) as never)
			.mockReturnValueOnce(createSelectBuilder([{ count: '2' }]) as never)
			.mockReturnValueOnce(
				createSelectBuilder([{ itemId: 'milk', name: 'Milk', count: '5' }]) as never
			)
			.mockReturnValueOnce(
				createSelectBuilder([{ dayOfWeek: 1, recipeId: 'pasta', name: 'Pasta' }]) as never
			)

		await expect(getHouseholdStats('household')).resolves.toEqual({
			stats: {
				totals: {
					lists: 2,
					items: 3,
					categories: 2,
					recipes: 4,
					listItems: 12
				},
				mostUsedItems: [{ itemId: 'milk', name: 'Milk', count: 5 }],
				favoriteRecipesByDay: [{ dayOfWeek: 1, recipeId: 'pasta', name: 'Pasta' }]
			}
		})
	})

	it('returns zero totals when stats queries have no rows', async () => {
		vi.mocked(db.select)
			.mockReturnValueOnce(createSelectBuilder([]) as never)
			.mockReturnValueOnce(createSelectBuilder([]) as never)
			.mockReturnValueOnce(createSelectBuilder([]) as never)
			.mockReturnValueOnce(createSelectBuilder([]) as never)
			.mockReturnValueOnce(createSelectBuilder([]) as never)

		await expect(getHouseholdStats('household')).resolves.toMatchObject({
			stats: {
				totals: {
					lists: 0,
					items: 0,
					categories: 0,
					recipes: 0,
					listItems: 0
				},
				mostUsedItems: [],
				favoriteRecipesByDay: []
			}
		})
	})
})

function userRow(
	overrides: Partial<{
		id: number
		name: string
		email: string
		password: string
		avatarPathname: string | null
		createdAt: Date
	}> = {}
) {
	return {
		id: 1,
		name: 'Remi',
		email: 'remi@example.com',
		password: 'hashed',
		avatarPathname: '/avatars/remi.png',
		createdAt: new Date('2026-01-01T00:00:00Z'),
		...overrides
	}
}

function itemRow(
	overrides: Partial<{
		id: string
		householdId: string
		name: string
		normalizedName: string
		defaultUnit: string | null
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
		createdAt: 1,
		updatedAt: 1,
		createdByUserId: 1,
		updatedByUserId: 1,
		...overrides
	}
}

function createCapturingUpdateBuilder<T>(rows: T[], onSet: (_values: unknown) => void) {
	const builder = createUpdateBuilder(rows)
	builder.set = (values: unknown) => {
		onSet(values)
		return builder
	}

	return builder
}
