import type { H3Event } from 'h3'

import { getAuthenticatedUserId, throwApiError } from '#server/utils/api-core'
import { createDomainId } from '#server/utils/api-helpers'
import { seedInitialDomainData } from '#server/utils/domains/seed'
import { and, asc, eq, isNull, sql } from 'drizzle-orm'
import { db, schema } from 'hub:db'

const DEFAULT_HOUSEHOLD_NAME = 'Thuis'
const DEFAULT_REFRESH_INTERVAL_MS = 5000
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000
const RESET_TTL_MS = 30 * 60 * 1000

export type HouseholdContext = {
	householdId: string
	userId: number
	isMultiTenancyEnabled: boolean
}

type AccessLinkType = 'invite' | 'reset'

/**
 * Resolves the active household for a request and enforces membership.
 *
 * @param event - H3 request event.
 * @returns Household context for domain-scoped API work.
 */
export async function getHouseholdContext(event: H3Event): Promise<HouseholdContext> {
	const userId = await getAuthenticatedUserId(event)
	const isMultiTenancyEnabled = getMultiTenancyEnabled(event)

	if (!isMultiTenancyEnabled) {
		const household = await ensureDefaultHousehold(userId)

		return {
			householdId: household.id,
			userId,
			isMultiTenancyEnabled
		}
	}

	const session = await getUserSession(event)
	const activeHouseholdId = session.activeHouseholdId

	if (activeHouseholdId && (await isHouseholdMember(activeHouseholdId, userId))) {
		return {
			householdId: activeHouseholdId,
			userId,
			isMultiTenancyEnabled
		}
	}

	const [membership] = await db
		.select({ householdId: schema.householdUsers.householdId })
		.from(schema.householdUsers)
		.where(eq(schema.householdUsers.userId, userId))
		.orderBy(asc(schema.householdUsers.createdAt), asc(schema.householdUsers.householdId))
		.limit(1)

	if (!membership) {
		throwApiError({
			code: 'FORBIDDEN',
			statusCode: 403,
			message: 'Je hebt geen toegang tot een huishouden.'
		})
	}

	await setActiveHouseholdSession(event, membership.householdId)

	return {
		householdId: membership.householdId,
		userId,
		isMultiTenancyEnabled
	}
}

/**
 * Ensures a default household exists and includes the given user.
 *
 * @param userId - User id to attach to the default household.
 * @returns Default household summary.
 */
export async function ensureDefaultHousehold(userId: number) {
	const [existing] = await db
		.select()
		.from(schema.households)
		.orderBy(asc(schema.households.createdAt), asc(schema.households.id))
		.limit(1)

	if (existing) {
		await ensureHouseholdMembership(existing.id, userId)
		await ensureHouseholdSettings(existing.id, userId)
		return existing
	}

	const now = Date.now()
	const [household] = await db
		.insert(schema.households)
		.values({
			id: createDomainId(),
			name: DEFAULT_HOUSEHOLD_NAME,
			createdAt: now,
			updatedAt: now
		})
		.returning()

	if (!household) {
		throwApiError({
			code: 'INTERNAL_ERROR',
			statusCode: 500,
			message: 'Huishouden kon niet worden aangemaakt.'
		})
	}

	await ensureHouseholdMembership(household.id, userId)
	await ensureHouseholdSettings(household.id, userId, now)
	await seedInitialDomainData(userId, household.id)

	return household
}

/**
 * Lists households available to a user.
 *
 * @param userId - Current user id.
 * @returns Household summaries.
 */
export async function listUserHouseholds(userId: number) {
	const rows = await db
		.select({
			id: schema.households.id,
			name: schema.households.name,
			createdAt: schema.households.createdAt
		})
		.from(schema.householdUsers)
		.innerJoin(schema.households, eq(schema.households.id, schema.householdUsers.householdId))
		.where(eq(schema.householdUsers.userId, userId))
		.orderBy(asc(schema.households.name), asc(schema.households.createdAt))

	return rows
}

/**
 * Switches the active household stored in the session.
 *
 * @param event - H3 request event.
 * @param householdId - Household to activate.
 */
export async function switchHousehold(event: H3Event, householdId: string) {
	const userId = await getAuthenticatedUserId(event)

	if (!(await isHouseholdMember(householdId, userId))) {
		throwApiError({
			code: 'FORBIDDEN',
			statusCode: 403,
			message: 'Je hebt geen toegang tot dit huishouden.'
		})
	}

	await setActiveHouseholdSession(event, householdId)

	return { activeHouseholdId: householdId }
}

/**
 * Resolves the household that should become active after login.
 *
 * @param userId - Authenticated user id.
 * @param event - Optional request event for runtime config.
 * @returns Household id, or undefined when the user has no membership.
 */
export async function resolveInitialHouseholdId(userId: number, event?: H3Event) {
	if (!getMultiTenancyEnabled(event)) {
		return (await ensureDefaultHousehold(userId)).id
	}

	const [membership] = await db
		.select({ householdId: schema.householdUsers.householdId })
		.from(schema.householdUsers)
		.where(eq(schema.householdUsers.userId, userId))
		.orderBy(asc(schema.householdUsers.createdAt), asc(schema.householdUsers.householdId))
		.limit(1)

	return membership?.householdId
}

/**
 * Returns household members in display order.
 *
 * @param householdId - Household id.
 * @returns Member summaries.
 */
export async function listHouseholdMembers(householdId: string) {
	return db
		.select({
			id: schema.users.id,
			name: schema.users.name,
			email: schema.users.email,
			avatarPathname: schema.users.avatarPathname,
			createdAt: schema.householdUsers.createdAt
		})
		.from(schema.householdUsers)
		.innerJoin(schema.users, eq(schema.users.id, schema.householdUsers.userId))
		.where(eq(schema.householdUsers.householdId, householdId))
		.orderBy(asc(schema.users.name), asc(schema.users.email))
}

/**
 * Removes a user from one household while keeping the account.
 *
 * @param householdId - Household id.
 * @param userId - Member user id to remove.
 */
export async function removeHouseholdMember(householdId: string, userId: number) {
	const [memberCount] = await db
		.select({ count: sql<number>`count(*)` })
		.from(schema.householdUsers)
		.where(eq(schema.householdUsers.householdId, householdId))

	if (Number(memberCount?.count ?? 0) <= 1) {
		throwApiError({
			code: 'CONFLICT',
			statusCode: 409,
			message: 'Minimaal één gezinslid moet toegang houden.'
		})
	}

	const [removed] = await db
		.delete(schema.householdUsers)
		.where(
			and(
				eq(schema.householdUsers.householdId, householdId),
				eq(schema.householdUsers.userId, userId)
			)
		)
		.returning({ userId: schema.householdUsers.userId })

	if (!removed) {
		throwApiError({
			code: 'NOT_FOUND',
			statusCode: 404,
			message: 'Gezinslid niet gevonden.'
		})
	}

	return { removedUserId: userId }
}

/**
 * Reads or creates household settings.
 *
 * @param householdId - Household id.
 * @param userId - User id for audit.
 * @returns Household settings.
 */
export async function ensureHouseholdSettings(
	householdId: string,
	userId: number,
	now = Date.now()
) {
	const [existing] = await db
		.select()
		.from(schema.householdSettings)
		.where(eq(schema.householdSettings.householdId, householdId))
		.limit(1)

	if (existing) {
		return existing
	}

	const [settings] = await db
		.insert(schema.householdSettings)
		.values({
			householdId,
			refreshIntervalMs: DEFAULT_REFRESH_INTERVAL_MS,
			createdAt: now,
			updatedAt: now,
			updatedByUserId: userId
		})
		.returning()

	if (!settings) {
		throwApiError({
			code: 'INTERNAL_ERROR',
			statusCode: 500,
			message: 'Instellingen konden niet worden aangemaakt.'
		})
	}

	return settings
}

/**
 * Updates household settings.
 *
 * @param householdId - Household id.
 * @param userId - Acting user id.
 * @param input - Settings patch.
 * @returns Updated settings.
 */
export async function updateHouseholdSettings(
	householdId: string,
	userId: number,
	input: { refreshIntervalMs: number }
) {
	await ensureHouseholdSettings(householdId, userId)
	const now = Date.now()
	const [settings] = await db
		.update(schema.householdSettings)
		.set({
			refreshIntervalMs: input.refreshIntervalMs,
			updatedAt: now,
			updatedByUserId: userId
		})
		.where(eq(schema.householdSettings.householdId, householdId))
		.returning()

	if (!settings) {
		throwApiError({
			code: 'INTERNAL_ERROR',
			statusCode: 500,
			message: 'Instellingen konden niet worden opgeslagen.'
		})
	}

	return settings
}

/**
 * Creates a one-time invite or reset link token.
 *
 * @param input - Link target and creator.
 * @returns Raw token and persisted link metadata.
 */
export async function createAccessLink(input: {
	type: AccessLinkType
	householdId: string
	createdByUserId: number
	userId?: number
}) {
	const token = createRandomToken()
	const tokenHash = await hashAccessToken(token)
	const now = Date.now()
	const ttl = input.type === 'invite' ? INVITE_TTL_MS : RESET_TTL_MS
	const [link] = await db
		.insert(schema.accessLinks)
		.values({
			id: createDomainId(),
			householdId: input.householdId,
			userId: input.userId ?? null,
			type: input.type,
			tokenHash,
			expiresAt: now + ttl,
			consumedAt: null,
			createdAt: now,
			createdByUserId: input.createdByUserId
		})
		.returning()

	if (!link) {
		throwApiError({
			code: 'INTERNAL_ERROR',
			statusCode: 500,
			message: 'Link kon niet worden aangemaakt.'
		})
	}

	return { token, link }
}

/**
 * Loads and consumes an access link by raw token.
 *
 * @param token - Raw one-time token.
 * @param type - Required link type.
 * @returns Consumed link.
 */
export async function consumeAccessLink(token: string, type: AccessLinkType) {
	const tokenHash = await hashAccessToken(token)
	const now = Date.now()
	const [link] = await db
		.select()
		.from(schema.accessLinks)
		.where(
			and(
				eq(schema.accessLinks.tokenHash, tokenHash),
				eq(schema.accessLinks.type, type),
				isNull(schema.accessLinks.consumedAt)
			)
		)
		.limit(1)

	if (!link || link.expiresAt < now) {
		throwApiError({
			code: 'NOT_FOUND',
			statusCode: 404,
			message: 'Deze link is verlopen of bestaat niet.'
		})
	}

	const [consumed] = await db
		.update(schema.accessLinks)
		.set({ consumedAt: now })
		.where(and(eq(schema.accessLinks.id, link.id), isNull(schema.accessLinks.consumedAt)))
		.returning()

	if (!consumed) {
		throwApiError({
			code: 'CONFLICT',
			statusCode: 409,
			message: 'Deze link is al gebruikt.'
		})
	}

	return consumed
}

/**
 * Adds a user to a household when missing.
 *
 * @param householdId - Household id.
 * @param userId - User id.
 */
export async function ensureHouseholdMembership(householdId: string, userId: number) {
	const [existing] = await db
		.select({ userId: schema.householdUsers.userId })
		.from(schema.householdUsers)
		.where(
			and(
				eq(schema.householdUsers.householdId, householdId),
				eq(schema.householdUsers.userId, userId)
			)
		)
		.limit(1)

	if (existing) {
		return
	}

	await db.insert(schema.householdUsers).values({
		householdId,
		userId,
		createdAt: Date.now()
	})
}

export function getMultiTenancyEnabled(event?: H3Event): boolean {
	return useRuntimeConfig(event).enableMultiTenancy === true
}

async function isHouseholdMember(householdId: string, userId: number): Promise<boolean> {
	const [membership] = await db
		.select({ userId: schema.householdUsers.userId })
		.from(schema.householdUsers)
		.where(
			and(
				eq(schema.householdUsers.householdId, householdId),
				eq(schema.householdUsers.userId, userId)
			)
		)
		.limit(1)

	return Boolean(membership)
}

async function setActiveHouseholdSession(event: H3Event, householdId: string): Promise<void> {
	const session = await getUserSession(event)

	if (!session.user) {
		return
	}

	await setUserSession(event, {
		user: session.user,
		loggedInAt: session.loggedInAt,
		activeHouseholdId: householdId
	})
}

function createRandomToken(): string {
	const bytes = new Uint8Array(32)
	crypto.getRandomValues(bytes)

	return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function hashAccessToken(token: string): Promise<string> {
	const data = new TextEncoder().encode(token)
	const digest = await crypto.subtle.digest('SHA-256', data)

	return [...new Uint8Array(digest)]
		.map((byte) => byte.toString(16).padStart(2, '0'))
		.join('')
}
