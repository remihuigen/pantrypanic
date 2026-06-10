import { createDomainId } from '#server/utils/api-helpers'
import { asc, eq } from 'drizzle-orm'
import { db, schema } from 'hub:db'

export const mealPlannerDayNumbers = [1, 2, 3, 4, 5, 6, 7] as const

type AuditInput = {
	userId: number
	now: number
}

/**
 * Seeds the default list and singleton meal planner rows when missing.
 *
 * @param auditUserId - Existing user id used for audit fields.
 */
export async function seedInitialDomainData(auditUserId: number): Promise<void> {
	const audit = {
		userId: auditUserId,
		now: Date.now()
	} satisfies AuditInput

	await ensureDefaultList(audit)
	await ensureMealPlannerDays(audit)
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

async function ensureDefaultList(audit: AuditInput): Promise<void> {
	const defaultListName = useRuntimeConfig().pantry.defaultListName

	const [existing] = await db
		.select({ id: schema.lists.id })
		.from(schema.lists)
		.where(eq(schema.lists.name, defaultListName))
		.limit(1)

	if (existing) {
		return
	}

	await db.insert(schema.lists).values({
		id: createDomainId(),
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

async function ensureMealPlannerDays(audit: AuditInput): Promise<void> {
	const rows = await db
		.select({ dayOfWeek: schema.mealPlannerDays.dayOfWeek })
		.from(schema.mealPlannerDays)

	const existingDays = new Set(rows.map((row) => row.dayOfWeek))
	const missingDays = mealPlannerDayNumbers.filter((dayOfWeek) => !existingDays.has(dayOfWeek))

	if (missingDays.length === 0) {
		return
	}

	await db.insert(schema.mealPlannerDays).values(
		missingDays.map((dayOfWeek) => ({
			id: createDomainId(),
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
