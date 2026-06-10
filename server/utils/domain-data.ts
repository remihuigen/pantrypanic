import { db, schema } from 'hub:db'
import { asc, eq } from 'drizzle-orm'

import { createDomainId } from '#server/utils/domain-ids'

export const defaultListName = 'Groceries'

export const mealPlannerDayNumbers = [1, 2, 3, 4, 5, 6, 7] as const

type AuditInput = {
	userId: number
	now: number
}

type CreateItemInput = {
	name: string
	defaultUnit?: string | null
	category?: string | null
	notes?: string | null
	auditUserId: number
}

/**
 * Normalizes an item name for canonical item reuse.
 *
 * @param name - User-entered item name.
 * @returns Lowercase item name with collapsed whitespace.
 */
export function normalizeItemName(name: string): string {
	return name.trim().replaceAll(/\s+/g, ' ').toLowerCase()
}

/**
 * Finds one canonical item by normalized name.
 *
 * @param normalizedName - Normalized item name to look up.
 * @returns Existing item row, or undefined when missing.
 */
export async function findItemByNormalizedName(normalizedName: string) {
	const [item] = await db
		.select()
		.from(schema.items)
		.where(eq(schema.items.normalizedName, normalizedName))
		.limit(1)

	return item
}

/**
 * Finds an existing canonical item or creates one when missing.
 *
 * @param input - Item data and audit user for creation.
 * @returns Existing or newly created item row.
 */
export async function findOrCreateItem(input: CreateItemInput) {
	const normalizedName = normalizeItemName(input.name)
	const existing = await findItemByNormalizedName(normalizedName)

	if (existing) {
		return existing
	}

	const now = Date.now()

	try {
		const [item] = await db
			.insert(schema.items)
			.values({
				id: createDomainId(),
				name: input.name.trim(),
				normalizedName,
				defaultUnit: input.defaultUnit ?? null,
				category: input.category ?? null,
				notes: input.notes ?? null,
				createdAt: now,
				updatedAt: now,
				createdByUserId: input.auditUserId,
				updatedByUserId: input.auditUserId
			})
			.returning()

		return assertReturnedRow(item, 'Item insert did not return a row.')
	} catch (error) {
		const item = await findItemByNormalizedName(normalizedName)

		if (item) {
			return item
		}

		throw error
	}
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

	const existingDays = new Set(rows.map(row => row.dayOfWeek))
	const missingDays = mealPlannerDayNumbers.filter(dayOfWeek => !existingDays.has(dayOfWeek))

	if (missingDays.length === 0) {
		return
	}

	await db.insert(schema.mealPlannerDays).values(
		missingDays.map(dayOfWeek => ({
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

function assertReturnedRow<T>(row: T | undefined, message: string): T {
	if (!row) {
		throw new Error(message)
	}

	return row
}
