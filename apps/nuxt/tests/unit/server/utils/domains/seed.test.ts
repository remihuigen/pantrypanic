import { db } from 'hub:db'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
	getFirstUserIdForDomainSeed,
	mealPlannerDayNumbers,
	seedInitialDomainData
} from '#server/utils/domains/seed'
import { createInsertBuilder, createSelectBuilder } from '#tests/support/drizzle-builders'

describe('server/utils/domains/seed.ts', () => {
	beforeEach(() => {
		vi.mocked(db.select).mockReset()
		vi.mocked(db.insert).mockReset()
		vi.stubGlobal('useRuntimeConfig', () => ({
			pantry: {
				defaultListName: 'Boodschappen'
			}
		}))
	})

	afterEach(() => {
		vi.unstubAllGlobals()
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
				createSelectBuilder(
					mealPlannerDayNumbers.map((dayOfWeek) => ({ dayOfWeek }))
				) as never
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
})
