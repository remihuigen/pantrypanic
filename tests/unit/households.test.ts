import { db } from 'hub:db'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
	consumeAccessLink,
	createAccessLink,
	getMultiTenancyEnabled,
	getHouseholdContext,
	removeHouseholdMember
} from '../../server/utils/households'
import {
	createDeleteBuilder,
	createInsertBuilder,
	createSelectBuilder,
	createUpdateBuilder
} from './test-db'

const mocks = vi.hoisted(() => ({
	createDomainId: vi.fn(() => 'domain-id'),
	getUserSession: vi.fn(),
	setUserSession: vi.fn(),
	seedInitialDomainData: vi.fn()
}))

vi.mock('#server/utils/api-helpers', () => ({
	createDomainId: mocks.createDomainId
}))

vi.mock('#server/utils/domains/seed', async () => {
	const actual = await vi.importActual<typeof import('../../server/utils/domains/seed')>(
		'../../server/utils/domains/seed'
	)

	return {
		...actual,
		seedInitialDomainData: mocks.seedInitialDomainData
	}
})

describe('household utilities', () => {
	beforeEach(() => {
		vi.mocked(db.select).mockReset()
		vi.mocked(db.insert).mockReset()
		vi.mocked(db.update).mockReset()
		vi.mocked(db.delete).mockReset()
		mocks.createDomainId.mockClear()
		mocks.getUserSession.mockReset()
		mocks.setUserSession.mockReset()
		mocks.seedInitialDomainData.mockClear()
		vi.stubGlobal('getUserSession', mocks.getUserSession)
		vi.stubGlobal('setUserSession', mocks.setUserSession)
		vi.stubGlobal('useRuntimeConfig', () => ({
			enableMultiTenancy: false,
			public: {
				enableMultiTenancy: false
			}
		}))
	})

	afterEach(() => {
		vi.useRealTimers()
		vi.unstubAllGlobals()
	})

	it('resolves the default household when multi-tenancy is disabled', async () => {
		mocks.getUserSession.mockResolvedValueOnce({ user: { id: 7 } })
		vi.mocked(db.select)
			.mockReturnValueOnce(createSelectBuilder([householdRow({ id: 'home' })]) as never)
			.mockReturnValueOnce(createSelectBuilder([{ userId: 7 }]) as never)
			.mockReturnValueOnce(createSelectBuilder([settingsRow({ householdId: 'home' })]) as never)

		await expect(getHouseholdContext({} as never)).resolves.toEqual({
			householdId: 'home',
			userId: 7,
			isMultiTenancyEnabled: false
		})

		expect(mocks.setUserSession).not.toHaveBeenCalled()
	})

	it('reads multi-tenancy from private server runtime config', () => {
		vi.stubGlobal('useRuntimeConfig', () => ({
			enableMultiTenancy: false,
			public: {
				enableMultiTenancy: true
			}
		}))

		expect(getMultiTenancyEnabled({} as never)).toBe(false)
	})

	it('uses the active session household when multi-tenancy is enabled and membership is valid', async () => {
		vi.stubGlobal('useRuntimeConfig', () => ({
			enableMultiTenancy: true,
			public: {
				enableMultiTenancy: true
			}
		}))
		mocks.getUserSession
			.mockResolvedValueOnce({ user: { id: 8 } })
			.mockResolvedValueOnce({ user: { id: 8 }, activeHouseholdId: 'family' })
		vi.mocked(db.select).mockReturnValueOnce(createSelectBuilder([{ userId: 8 }]) as never)

		await expect(getHouseholdContext({} as never)).resolves.toMatchObject({
			householdId: 'family',
			userId: 8,
			isMultiTenancyEnabled: true
		})
	})

	it('falls back to the first membership and updates the session when active household is invalid', async () => {
		vi.stubGlobal('useRuntimeConfig', () => ({
			enableMultiTenancy: true,
			public: {
				enableMultiTenancy: true
			}
		}))
		mocks.getUserSession
			.mockResolvedValueOnce({ user: { id: 9 } })
			.mockResolvedValueOnce({ user: { id: 9 }, loggedInAt: 123, activeHouseholdId: 'old' })
			.mockResolvedValueOnce({ user: { id: 9 }, loggedInAt: 123, activeHouseholdId: 'old' })
		vi.mocked(db.select)
			.mockReturnValueOnce(createSelectBuilder([]) as never)
			.mockReturnValueOnce(createSelectBuilder([{ householdId: 'fallback' }]) as never)

		await expect(getHouseholdContext({} as never)).resolves.toMatchObject({
			householdId: 'fallback',
			userId: 9,
			isMultiTenancyEnabled: true
		})
		expect(mocks.setUserSession).toHaveBeenCalledWith(
			{},
			{
				user: { id: 9 },
				loggedInAt: 123,
				activeHouseholdId: 'fallback'
			}
		)
	})

	it('prevents removing the last household member', async () => {
		vi.mocked(db.select).mockReturnValueOnce(createSelectBuilder([{ count: 1 }]) as never)

		await expect(removeHouseholdMember('household', 1)).rejects.toMatchObject({
			statusCode: 409,
			message: 'Minimaal één gezinslid moet toegang houden.'
		})
		expect(db.delete).not.toHaveBeenCalled()
	})

	it('removes membership without deleting the user account', async () => {
		vi.mocked(db.select).mockReturnValueOnce(createSelectBuilder([{ count: 2 }]) as never)
		vi.mocked(db.delete).mockReturnValueOnce(createDeleteBuilder([{ userId: 2 }]) as never)

		await expect(removeHouseholdMember('household', 2)).resolves.toEqual({ removedUserId: 2 })
		expect(db.delete).toHaveBeenCalledTimes(1)
	})

	it('stores only access-link hashes and consumes valid one-time links', async () => {
		vi.useFakeTimers()
		vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
		let insertedValues: unknown
		let updateValues: unknown
		vi.mocked(db.insert).mockReturnValueOnce(
			createCapturingInsertBuilder([accessLinkRow()], (values) => {
				insertedValues = values
			}) as never
		)

		const created = await createAccessLink({
			type: 'invite',
			householdId: 'household',
			createdByUserId: 1
		})

		expect(created.token).toHaveLength(64)
		expect(insertedValues).toMatchObject({
			householdId: 'household',
			type: 'invite',
			tokenHash: expect.not.stringMatching(created.token),
			expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
			consumedAt: null
		})

		vi.mocked(db.select).mockReturnValueOnce(createSelectBuilder([accessLinkRow()]) as never)
		vi.mocked(db.update).mockReturnValueOnce(
			createCapturingUpdateBuilder([accessLinkRow({ consumedAt: Date.now() })], (values) => {
				updateValues = values
			}) as never
		)

		await expect(consumeAccessLink(created.token, 'invite')).resolves.toMatchObject({
			id: 'access-link',
			consumedAt: Date.now()
		})
		expect(updateValues).toEqual({ consumedAt: Date.now() })
	})

	it('rejects expired access links before marking them consumed', async () => {
		vi.useFakeTimers()
		vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
		vi.mocked(db.select).mockReturnValueOnce(
			createSelectBuilder([accessLinkRow({ expiresAt: Date.now() - 1 })]) as never
		)

		await expect(consumeAccessLink('expired-token', 'reset')).rejects.toMatchObject({
			statusCode: 404,
			message: 'Deze link is verlopen of bestaat niet.'
		})
		expect(db.update).not.toHaveBeenCalled()
	})
})

function householdRow(overrides: Partial<{ id: string; name: string; createdAt: number; updatedAt: number }> = {}) {
	return {
		id: 'household',
		name: 'Thuis',
		createdAt: 1,
		updatedAt: 1,
		...overrides
	}
}

function settingsRow(overrides: Partial<{ householdId: string; refreshIntervalMs: number }> = {}) {
	return {
		householdId: 'household',
		refreshIntervalMs: 5000,
		createdAt: 1,
		updatedAt: 1,
		updatedByUserId: 1,
		...overrides
	}
}

function accessLinkRow(
	overrides: Partial<{
		id: string
		householdId: string
		userId: number | null
		type: 'invite' | 'reset'
		tokenHash: string
		expiresAt: number
		consumedAt: number | null
		createdAt: number
		createdByUserId: number
	}> = {}
) {
	return {
		id: 'access-link',
		householdId: 'household',
		userId: null,
		type: 'invite' as const,
		tokenHash: 'hash',
		expiresAt: Date.now() + 1000,
		consumedAt: null,
		createdAt: Date.now(),
		createdByUserId: 1,
		...overrides
	}
}

function createCapturingInsertBuilder<T>(rows: T[], onValues: (_values: unknown) => void) {
	const builder = createInsertBuilder(rows)
	builder.values = (values: unknown) => {
		onValues(values)
		return builder
	}

	return builder
}

function createCapturingUpdateBuilder<T>(rows: T[], onSet: (_values: unknown) => void) {
	const builder = createUpdateBuilder(rows)
	builder.set = (values: unknown) => {
		onSet(values)
		return builder
	}

	return builder
}
