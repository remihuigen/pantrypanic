import { db } from 'hub:db'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
	consumeAccessLink,
	assignHouseholdOwner,
	createAccessLink,
	deleteAccount,
	destroyCurrentHousehold,
	ensureDefaultHousehold,
	ensureHouseholdMembership,
	ensureHouseholdSettings,
	getMultiTenancyEnabled,
	getHouseholdContext,
	listHouseholdMembers,
	listUserHouseholds,
	leaveHousehold,
	removeHouseholdMember,
	resolveInitialHouseholdId,
	switchHousehold,
	updateHouseholdSettings
} from '../../server/utils/households'
import {
	createDeleteBuilder,
	createInsertBuilder,
	createSelectBuilder,
	createUpdateBuilder
} from './test-db'

const mocks = vi.hoisted(() => ({
	authorize: vi.fn(),
	createDomainId: vi.fn(() => 'domain-id'),
	clearUserSession: vi.fn(),
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
		mocks.authorize.mockReset()
		mocks.createDomainId.mockClear()
		mocks.clearUserSession.mockClear()
		mocks.getUserSession.mockReset()
		mocks.setUserSession.mockReset()
		mocks.seedInitialDomainData.mockClear()
		vi.stubGlobal('getUserSession', mocks.getUserSession)
		vi.stubGlobal('setUserSession', mocks.setUserSession)
		vi.stubGlobal('clearUserSession', mocks.clearUserSession)
		vi.stubGlobal('authorize', mocks.authorize)
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
			.mockReturnValueOnce(createSelectBuilder([{ userId: 7, role: 'householdOwner' }]) as never)
			.mockReturnValueOnce(createSelectBuilder([settingsRow({ householdId: 'home' })]) as never)

		await expect(getHouseholdContext({} as never)).resolves.toEqual({
			householdId: 'home',
			userId: 7,
			isMultiTenancyEnabled: false
		})

		expect(mocks.setUserSession).not.toHaveBeenCalled()
	})

	it('authorizes household context with the resolved membership role', async () => {
		const ability = {
			allowGuest: false,
			original: vi.fn(),
			execute: vi.fn()
		} as never
		mocks.getUserSession.mockResolvedValueOnce({ user: { id: 7 } })
		vi.mocked(db.select)
			.mockReturnValueOnce(createSelectBuilder([householdRow({ id: 'home' })]) as never)
			.mockReturnValueOnce(createSelectBuilder([{ userId: 7, role: 'householdOwner' }]) as never)
			.mockReturnValueOnce(createSelectBuilder([settingsRow({ householdId: 'home' })]) as never)
			.mockReturnValueOnce(createSelectBuilder([{ role: 'householdOwner' }]) as never)

		await expect(
			getHouseholdContext({} as never, { authorize: ability })
		).resolves.toMatchObject({
			householdId: 'home',
			userId: 7,
			role: 'householdOwner'
		})
		expect(mocks.authorize).toHaveBeenCalledWith({}, ability, 'householdOwner')
	})

	it('propagates authorization failures from household context', async () => {
		const ability = {
			allowGuest: false,
			original: vi.fn(),
			execute: vi.fn()
		} as never
		const error = Object.assign(new Error('Niet toegestaan.'), { statusCode: 403 })
		vi.stubGlobal('useRuntimeConfig', () => ({
			enableMultiTenancy: true,
			public: {
				enableMultiTenancy: true
			}
		}))
		mocks.authorize.mockRejectedValueOnce(error)
		mocks.getUserSession
			.mockResolvedValueOnce({ user: { id: 7 } })
			.mockResolvedValueOnce({ user: { id: 7 }, activeHouseholdId: 'home' })
		vi.mocked(db.select)
			.mockReturnValueOnce(createSelectBuilder([{ userId: 7 }]) as never)
			.mockReturnValueOnce(createSelectBuilder([{ role: 'member' }]) as never)

		await expect(getHouseholdContext({} as never, { authorize: ability })).rejects.toBe(error)
		expect(mocks.authorize).toHaveBeenCalledWith({}, ability, 'member')
	})

	it('creates the default household, membership, settings, and seed data when none exists', async () => {
		vi.useFakeTimers()
		vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
		let householdValues: unknown
		let membershipValues: unknown
		let settingsValues: unknown
		vi.mocked(db.select)
			.mockReturnValueOnce(createSelectBuilder([]) as never)
			.mockReturnValueOnce(createSelectBuilder([]) as never)
			.mockReturnValueOnce(createSelectBuilder([]) as never)
		vi.mocked(db.insert)
			.mockReturnValueOnce(
				createCapturingInsertBuilder([householdRow({ id: 'new-home' })], (values) => {
					householdValues = values
				}) as never
			)
			.mockReturnValueOnce(
				createCapturingInsertBuilder([], (values) => {
					membershipValues = values
				}) as never
			)
			.mockReturnValueOnce(
				createCapturingInsertBuilder([settingsRow({ householdId: 'new-home' })], (values) => {
					settingsValues = values
				}) as never
			)

		await expect(ensureDefaultHousehold(7)).resolves.toMatchObject({ id: 'new-home' })

		expect(householdValues).toMatchObject({
			id: 'domain-id',
			name: 'Thuis',
			createdAt: Date.now(),
			updatedAt: Date.now()
		})
		expect(membershipValues).toMatchObject({
			householdId: 'new-home',
			userId: 7,
			createdAt: Date.now()
		})
		expect(settingsValues).toMatchObject({
			householdId: 'new-home',
			refreshIntervalMs: 5000,
			updatedByUserId: 7
		})
		expect(mocks.seedInitialDomainData).toHaveBeenCalledWith(7, 'new-home')
	})

	it('throws when the default household insert returns no row', async () => {
		vi.mocked(db.select).mockReturnValueOnce(createSelectBuilder([]) as never)
		vi.mocked(db.insert).mockReturnValueOnce(createInsertBuilder([]) as never)

		await expect(ensureDefaultHousehold(7)).rejects.toMatchObject({
			statusCode: 500,
			message: 'Huishouden kon niet worden aangemaakt.'
		})
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

	it('rejects household context when multi-tenancy is enabled and the user has no membership', async () => {
		vi.stubGlobal('useRuntimeConfig', () => ({
			enableMultiTenancy: true,
			public: {
				enableMultiTenancy: true
			}
		}))
		mocks.getUserSession
			.mockResolvedValueOnce({ user: { id: 9 } })
			.mockResolvedValueOnce({ user: { id: 9 }, activeHouseholdId: null })
		vi.mocked(db.select).mockReturnValueOnce(createSelectBuilder([]) as never)

		await expect(getHouseholdContext({} as never)).rejects.toMatchObject({
			statusCode: 403,
			message: 'Je hebt geen toegang tot een huishouden.'
		})
	})

	it('lists user households and household members', async () => {
		vi.mocked(db.select)
			.mockReturnValueOnce(createSelectBuilder([householdRow({ id: 'home' })]) as never)
			.mockReturnValueOnce(createSelectBuilder([memberRow({ id: 2, name: 'Britt' })]) as never)

		await expect(listUserHouseholds(1)).resolves.toEqual([householdRow({ id: 'home' })])
		await expect(listHouseholdMembers('home')).resolves.toEqual([memberRow({ id: 2, name: 'Britt' })])
	})

	it('switches active household after verifying membership', async () => {
		mocks.getUserSession
			.mockResolvedValueOnce({ user: { id: 8 } })
			.mockResolvedValueOnce({ user: { id: 8 }, loggedInAt: 123 })
		vi.mocked(db.select).mockReturnValueOnce(createSelectBuilder([{ userId: 8 }]) as never)

		await expect(switchHousehold({} as never, 'family')).resolves.toEqual({
			activeHouseholdId: 'family'
		})
		expect(mocks.setUserSession).toHaveBeenCalledWith(
			{},
			{
				user: { id: 8 },
				loggedInAt: 123,
				activeHouseholdId: 'family'
			}
		)
	})

	it('rejects switching to households where the user is not a member', async () => {
		mocks.getUserSession.mockResolvedValueOnce({ user: { id: 8 } })
		vi.mocked(db.select).mockReturnValueOnce(createSelectBuilder([]) as never)

		await expect(switchHousehold({} as never, 'family')).rejects.toMatchObject({
			statusCode: 403,
			message: 'Je hebt geen toegang tot dit huishouden.'
		})
		expect(mocks.setUserSession).not.toHaveBeenCalled()
	})

	it('resolves initial household id for enabled multi-tenancy without creating defaults', async () => {
		vi.stubGlobal('useRuntimeConfig', () => ({
			enableMultiTenancy: true,
			public: {
				enableMultiTenancy: true
			}
		}))
		vi.mocked(db.select).mockReturnValueOnce(createSelectBuilder([{ householdId: 'family' }]) as never)

		await expect(resolveInitialHouseholdId(8, {} as never)).resolves.toBe('family')
		expect(db.insert).not.toHaveBeenCalled()
	})

	it('returns undefined initial household id when enabled users have no memberships', async () => {
		vi.stubGlobal('useRuntimeConfig', () => ({
			enableMultiTenancy: true,
			public: {
				enableMultiTenancy: true
			}
		}))
		vi.mocked(db.select).mockReturnValueOnce(createSelectBuilder([]) as never)

		await expect(resolveInitialHouseholdId(8, {} as never)).resolves.toBeUndefined()
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
		vi.mocked(db.select)
			.mockReturnValueOnce(createSelectBuilder([{ count: 2 }]) as never)
			.mockReturnValueOnce(createSelectBuilder([{ role: 'member' }]) as never)
		vi.mocked(db.delete).mockReturnValueOnce(createDeleteBuilder([{ userId: 2 }]) as never)

		await expect(removeHouseholdMember('household', 2)).resolves.toEqual({ removedUserId: 2 })
		expect(db.delete).toHaveBeenCalledTimes(1)
	})

	it('throws when removing a non-existing household member', async () => {
		vi.mocked(db.select)
			.mockReturnValueOnce(createSelectBuilder([{ count: 2 }]) as never)
			.mockReturnValueOnce(createSelectBuilder([]) as never)
		vi.mocked(db.delete).mockReturnValueOnce(createDeleteBuilder([]) as never)

		await expect(removeHouseholdMember('household', 2)).rejects.toMatchObject({
			statusCode: 404,
			message: 'Gezinslid niet gevonden.'
		})
		expect(db.delete).not.toHaveBeenCalled()
	})

	it('promotes household members to owner', async () => {
		vi.mocked(db.update).mockReturnValueOnce(
			createUpdateBuilder([{ userId: 2, role: 'householdOwner' }]) as never
		)

		await expect(assignHouseholdOwner('household', 2)).resolves.toEqual({
			userId: 2,
			role: 'householdOwner'
		})
	})

	it('rejects removing the only owner while other members remain', async () => {
		vi.mocked(db.select)
			.mockReturnValueOnce(createSelectBuilder([{ count: 2 }]) as never)
			.mockReturnValueOnce(createSelectBuilder([{ role: 'householdOwner' }]) as never)
			.mockReturnValueOnce(createSelectBuilder([{ count: 2 }]) as never)
			.mockReturnValueOnce(createSelectBuilder([{ count: 1 }]) as never)

		await expect(removeHouseholdMember('household', 1)).rejects.toMatchObject({
			statusCode: 409,
			message: 'Wijs eerst een nieuwe eigenaar aan.'
		})
		expect(db.delete).not.toHaveBeenCalled()
	})

	it('lets members leave and moves their session to the next household', async () => {
		mocks.getUserSession.mockResolvedValueOnce({ user: { id: 1 }, loggedInAt: 123 })
		vi.mocked(db.select)
			.mockReturnValueOnce(createSelectBuilder([{ count: 2 }]) as never)
			.mockReturnValueOnce(createSelectBuilder([{ role: 'member' }]) as never)
			.mockReturnValueOnce(createSelectBuilder([{ householdId: 'next' }]) as never)
		vi.mocked(db.delete).mockReturnValueOnce(createDeleteBuilder([]) as never)

		await expect(leaveHousehold({} as never, 'household', 1)).resolves.toEqual({
			leftHouseholdId: 'household',
			destroyedHousehold: false
		})
		expect(mocks.setUserSession).toHaveBeenCalledWith(
			{},
			{ user: { id: 1 }, loggedInAt: 123, activeHouseholdId: 'next' }
		)
	})

	it('destroys the household when the last member leaves', async () => {
		mocks.getUserSession.mockResolvedValueOnce({ user: { id: 1 }, loggedInAt: 123 })
		vi.mocked(db.select)
			.mockReturnValueOnce(createSelectBuilder([{ count: 1 }]) as never)
			.mockReturnValueOnce(createSelectBuilder([]) as never)
		vi.mocked(db.delete).mockReturnValue(createDeleteBuilder([]) as never)

		await expect(leaveHousehold({} as never, 'household', 1)).resolves.toEqual({
			leftHouseholdId: 'household',
			destroyedHousehold: true
		})
		expect(db.delete).toHaveBeenCalledTimes(11)
		expect(mocks.setUserSession).toHaveBeenCalledWith(
			{},
			{ user: { id: 1 }, loggedInAt: 123, activeHouseholdId: undefined }
		)
	})

	it('lets owners destroy a household without deleting user accounts', async () => {
		mocks.getUserSession.mockResolvedValueOnce({ user: { id: 1 }, loggedInAt: 123 })
		vi.mocked(db.select).mockReturnValueOnce(createSelectBuilder([]) as never)
		vi.mocked(db.delete).mockReturnValue(createDeleteBuilder([]) as never)

		await expect(destroyCurrentHousehold({} as never, 'household', 1)).resolves.toEqual({
			destroyedHouseholdId: 'household'
		})
		expect(db.delete).toHaveBeenCalledTimes(11)
	})

	it('deletes accounts after removing memberships and clearing last households', async () => {
		vi.mocked(db.select)
			.mockReturnValueOnce(
				createSelectBuilder([{ householdId: 'household', role: 'member' }]) as never
			)
			.mockReturnValueOnce(createSelectBuilder([{ role: 'member' }]) as never)
			.mockReturnValueOnce(createSelectBuilder([{ count: 1 }]) as never)
		vi.mocked(db.delete).mockReturnValue(createDeleteBuilder([]) as never)

		await expect(deleteAccount({} as never, 1)).resolves.toEqual({ deletedUserId: 1 })
		expect(db.delete).toHaveBeenCalledTimes(12)
		expect(mocks.clearUserSession).toHaveBeenCalledWith({})
	})

	it('creates household settings when missing and returns existing settings when present', async () => {
		let settingsValues: unknown
		vi.mocked(db.select)
			.mockReturnValueOnce(createSelectBuilder([settingsRow({ refreshIntervalMs: 9000 })]) as never)
			.mockReturnValueOnce(createSelectBuilder([]) as never)
		vi.mocked(db.insert).mockReturnValueOnce(
			createCapturingInsertBuilder([settingsRow({ householdId: 'work' })], (values) => {
				settingsValues = values
			}) as never
		)

		await expect(ensureHouseholdSettings('home', 1)).resolves.toMatchObject({
			refreshIntervalMs: 9000
		})
		await expect(ensureHouseholdSettings('work', 2, 123)).resolves.toMatchObject({
			householdId: 'work'
		})
		expect(settingsValues).toMatchObject({
			householdId: 'work',
			refreshIntervalMs: 5000,
			createdAt: 123,
			updatedAt: 123,
			updatedByUserId: 2
		})
	})

	it('throws when household settings cannot be created or saved', async () => {
		vi.mocked(db.select).mockReturnValueOnce(createSelectBuilder([]) as never)
		vi.mocked(db.insert).mockReturnValueOnce(createInsertBuilder([]) as never)

		await expect(ensureHouseholdSettings('home', 1)).rejects.toMatchObject({
			statusCode: 500,
			message: 'Instellingen konden niet worden aangemaakt.'
		})

		vi.mocked(db.select).mockReturnValueOnce(createSelectBuilder([settingsRow()]) as never)
		vi.mocked(db.update).mockReturnValueOnce(createUpdateBuilder([]) as never)

		await expect(
			updateHouseholdSettings('home', 1, { refreshIntervalMs: 30000 })
		).rejects.toMatchObject({
			statusCode: 500,
			message: 'Instellingen konden niet worden opgeslagen.'
		})
	})

	it('updates household settings with audit metadata', async () => {
		vi.useFakeTimers()
		vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
		let updateValues: unknown
		vi.mocked(db.select).mockReturnValueOnce(createSelectBuilder([settingsRow()]) as never)
		vi.mocked(db.update).mockReturnValueOnce(
			createCapturingUpdateBuilder([settingsRow({ refreshIntervalMs: 45000 })], (values) => {
				updateValues = values
			}) as never
		)

		await expect(
			updateHouseholdSettings('home', 3, { refreshIntervalMs: 45000 })
		).resolves.toMatchObject({
			refreshIntervalMs: 45000
		})
		expect(updateValues).toEqual({
			refreshIntervalMs: 45000,
			updatedAt: Date.now(),
			updatedByUserId: 3
		})
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

	it('creates reset links with short expiry and target user id', async () => {
		vi.useFakeTimers()
		vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
		let insertedValues: unknown
		vi.mocked(db.insert).mockReturnValueOnce(
			createCapturingInsertBuilder([accessLinkRow({ type: 'reset', userId: 9 })], (values) => {
				insertedValues = values
			}) as never
		)

		await createAccessLink({
			type: 'reset',
			householdId: 'household',
			createdByUserId: 1,
			userId: 9
		})

		expect(insertedValues).toMatchObject({
			userId: 9,
			type: 'reset',
			expiresAt: Date.now() + 30 * 60 * 1000
		})
	})

	it('throws when access links cannot be created or are consumed concurrently', async () => {
		vi.useFakeTimers()
		vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
		vi.mocked(db.insert).mockReturnValueOnce(createInsertBuilder([]) as never)

		await expect(
			createAccessLink({ type: 'invite', householdId: 'household', createdByUserId: 1 })
		).rejects.toMatchObject({
			statusCode: 500,
			message: 'Link kon niet worden aangemaakt.'
		})

		vi.mocked(db.select).mockReturnValueOnce(createSelectBuilder([accessLinkRow()]) as never)
		vi.mocked(db.update).mockReturnValueOnce(createUpdateBuilder([]) as never)

		await expect(consumeAccessLink('already-used', 'invite')).rejects.toMatchObject({
			statusCode: 409,
			message: 'Deze link is al gebruikt.'
		})
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

	it('adds household memberships only when missing', async () => {
		vi.mocked(db.select)
			.mockReturnValueOnce(createSelectBuilder([{ userId: 1, role: 'member' }]) as never)
			.mockReturnValueOnce(createSelectBuilder([]) as never)
		vi.mocked(db.update).mockReturnValueOnce(createUpdateBuilder([]) as never)
		vi.mocked(db.insert).mockReturnValueOnce(createInsertBuilder([]) as never)

		await ensureHouseholdMembership('home', 1, 'householdOwner')
		await ensureHouseholdMembership('home', 2)

		expect(db.update).toHaveBeenCalledTimes(1)
		expect(db.insert).toHaveBeenCalledTimes(1)
	})
})

function memberRow(
	overrides: Partial<{
		id: number
		name: string
		email: string
		avatarPathname: string | null
		createdAt: number
	}> = {}
) {
	return {
		id: 1,
		name: 'Remi',
		email: 'remi@example.com',
		avatarPathname: null,
		createdAt: 1,
		...overrides
	}
}

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
