import { createDomainId } from '#server/utils/api-helpers'
import { and, asc, eq } from 'drizzle-orm'
import { db, schema } from 'hub:db'
import type { H3Event } from 'h3'

export const mealPlannerDayNumbers = [1, 2, 3, 4, 5, 6, 7] as const

type AuditInput = {
	userId: number
	now: number
}

/**
 * Seeds the default list and singleton meal planner rows when missing.
 *
 * @param auditUserId - Existing user id used for audit fields.
 * @param householdId - Household id to seed.
 */
export async function seedInitialDomainData(
	auditUserId: number,
	householdId?: string,
	event?: H3Event
): Promise<void> {
	const resolvedHouseholdId = householdId ?? '019f0000-0000-7000-8000-000000000001'
	const defaultListName = getDefaultListName(event)
	const audit = {
		userId: auditUserId,
		now: Date.now()
	} satisfies AuditInput

	await ensureDefaultList(audit, resolvedHouseholdId, defaultListName)
	await ensureMealPlannerDays(audit, resolvedHouseholdId)
}

/**
 * Returns the first existing user id for optional seed operations.
 *
 * @returns First user id, or undefined when no users exist.
 */
export async function getFirstUserIdForDomainSeed(): Promise<number | undefined> {
	const [user] = await db
		.select({ id: schema.users.id })
		.from(schema.users)
		.orderBy(asc(schema.users.id))
		.limit(1)

	return user?.id
}

async function ensureDefaultList(
	audit: AuditInput,
	householdId: string,
	defaultListName: string
): Promise<void> {
	const [existing] = await db
		.select({ id: schema.lists.id })
		.from(schema.lists)
		.where(and(eq(schema.lists.householdId, householdId), eq(schema.lists.name, defaultListName)))
		.limit(1)

	if (existing) {
		return
	}

	await db.insert(schema.lists).values({
		id: createDomainId(),
		householdId,
		name: defaultListName,
		status: 'active',
		position: 0,
		archivedAt: null,
		deletedAt: null,
		createdAt: audit.now,
		updatedAt: audit.now,
		createdByUserId: audit.userId,
		updatedByUserId: audit.userId
	})
}

function getDefaultListName(event?: H3Event) {
	const config = useRuntimeConfig(event)

	return config.pantry?.defaultListName || 'Boodschappen'
}

async function ensureMealPlannerDays(audit: AuditInput, householdId: string): Promise<void> {
	const rows = await db
		.select({ dayOfWeek: schema.mealPlannerDays.dayOfWeek })
		.from(schema.mealPlannerDays)
		.where(eq(schema.mealPlannerDays.householdId, householdId))

	const existingDays = new Set(rows.map((row) => row.dayOfWeek))
	const missingDays = mealPlannerDayNumbers.filter((dayOfWeek) => !existingDays.has(dayOfWeek))

	if (missingDays.length === 0) {
		return
	}

	await db.insert(schema.mealPlannerDays).values(
		missingDays.map((dayOfWeek) => ({
			id: createDomainId(),
			householdId,
			dayOfWeek,
			type: 'empty' as const,
			recipeId: null,
			placeholderName: null,
			placeholderNotes: null,
			createdAt: audit.now,
			updatedAt: audit.now,
			createdByUserId: audit.userId,
			updatedByUserId: audit.userId
		}))
	)
}
