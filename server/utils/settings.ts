import { seedInitialDomainData } from '#server/utils/domains/seed'
import { normalizeItemName } from '#server/utils/domains/items'
import { optional, throwApiError } from '#server/utils/api-core'
import { and, asc, desc, eq, inArray, ne, or, sql } from 'drizzle-orm'
import { db, schema } from 'hub:db'
import { z } from 'zod'

export const householdSwitchBodySchema = z.strictObject({
	householdId: z.string().trim().min(1).max(200)
})

export const householdCreateBodySchema = z.strictObject({
	name: z.string().trim().min(1).max(120)
})

export const householdSettingsBodySchema = z.strictObject({
	refreshIntervalMs: z
		.number({ error: 'Interval moet een getal zijn.' })
		.int({ error: 'Interval moet een getal zijn.' })
		.min(1000, { error: 'Interval moet minimaal 1 seconde zijn.' })
		.max(300000, { error: 'Interval mag maximaal 5 minuten zijn.' })
})

export const userIdParamsSchema = z.strictObject({
	userId: z.coerce.number().int().positive()
})

export const itemParamsSchema = z.strictObject({
	itemId: z.string().trim().min(1).max(200)
})

export const itemListQuerySchema = z.strictObject({
	q: z.string().trim().max(120).optional()
})

export const itemUpdateBodySchema = z
	.strictObject({
		name: z.string().trim().min(1).max(120).optional(),
		defaultUnit: z.string().trim().max(40).nullable().optional()
	})
	.refine(
		(value) => value.name !== undefined || value.defaultUnit !== undefined,
		{ error: 'Minimaal een veld is verplicht.' }
	)

export const itemMergeBodySchema = z.strictObject({
	targetItemId: z.string().trim().min(1).max(200)
})

export const inviteAcceptBodySchema = z.strictObject({
	token: z.string().trim().min(1),
	name: z.string().trim().min(1).max(120),
	email: z.email().trim().toLowerCase(),
	password: z.string().min(8).max(1024)
})

export const accessTokenBodySchema = z.strictObject({
	token: z.string().trim().min(1)
})

export const profileUpdateBodySchema = z
	.strictObject({
		name: z.string().trim().min(1).max(120).optional(),
		email: z.email().trim().toLowerCase().optional(),
		password: z.string().min(8).max(1024).optional(),
		avatarPathname: z.string().trim().min(1).max(500).nullable().optional()
	})
	.refine(
		(value) =>
			value.name !== undefined ||
			value.email !== undefined ||
			value.password !== undefined ||
			value.avatarPathname !== undefined,
		{ error: 'Minimaal een veld is verplicht.' }
	)

/**
 * Converts household settings rows to API response data.
 *
 * @param settings - Household settings row.
 * @returns Serialized settings.
 */
export function serializeSettings(settings: typeof schema.householdSettings.$inferSelect) {
	return {
		refreshIntervalMs: settings.refreshIntervalMs,
		updatedAt: settings.updatedAt
	}
}

/**
 * Reads one user's profile.
 *
 * @param userId - User id to read.
 * @returns Serialized profile payload.
 */
export async function getProfile(userId: number) {
	const [user] = await db
		.select({
			id: schema.users.id,
			name: schema.users.name,
			email: schema.users.email,
			avatarPathname: schema.users.avatarPathname,
			createdAt: schema.users.createdAt
		})
		.from(schema.users)
		.where(eq(schema.users.id, userId))
		.limit(1)

	if (!user) {
		throwApiError({ code: 'NOT_FOUND', statusCode: 404, message: 'Gebruiker niet gevonden.' })
	}

	return { user: serializeUserProfile(user) }
}

/**
 * Updates one user's personal profile fields.
 *
 * @param userId - User id to update.
 * @param input - Validated profile patch.
 * @returns Serialized profile payload.
 */
export async function updateProfile(userId: number, input: z.infer<typeof profileUpdateBodySchema>) {
	if (input.email !== undefined) {
		const [existing] = await db
			.select({ id: schema.users.id })
			.from(schema.users)
			.where(and(eq(schema.users.email, input.email), ne(schema.users.id, userId)))
			.limit(1)

		if (existing) {
			throwApiError({
				code: 'CONFLICT',
				statusCode: 409,
				message: 'Dit e-mailadres is al in gebruik.'
			})
		}
	}

	const [user] = await db
		.update(schema.users)
		.set({
			...(input.name === undefined ? {} : { name: input.name }),
			...(input.email === undefined ? {} : { email: input.email }),
			...(input.avatarPathname === undefined ? {} : { avatarPathname: input.avatarPathname }),
			...(input.password === undefined ? {} : { password: await hashPassword(input.password) })
		})
		.where(eq(schema.users.id, userId))
		.returning()

	if (!user) {
		throwApiError({ code: 'NOT_FOUND', statusCode: 404, message: 'Gebruiker niet gevonden.' })
	}

	return { user: serializeUserProfile(user) }
}

/**
 * Lists all canonical items for the item vault.
 *
 * @param householdId - Active household id.
 * @param query - Optional item search query.
 * @returns Item vault rows with usage counts.
 */
export async function listAllItems(householdId: string, query: z.infer<typeof itemListQuerySchema>) {
	const normalized = query.q ? `%${normalizeItemName(query.q)}%` : undefined
	const rows = await db
		.select()
		.from(schema.items)
		.where(
			and(
				eq(schema.items.householdId, householdId),
				normalized === undefined
					? undefined
					: or(
							sql`lower(${schema.items.name}) like ${normalized}`,
							sql`${schema.items.normalizedName} like ${normalized}`
						)
			)
		)
		.orderBy(asc(schema.items.name))

	const usage = await getItemUsageCounts(householdId)

	return {
		items: rows.map((item) => ({
			...serializeSettingsItem(item),
			usageCount: usage.get(item.id)?.total ?? 0,
			activeListItemUsageCount: usage.get(item.id)?.activeListItems ?? 0
		}))
	}
}

/**
 * Updates one canonical item in the item vault.
 *
 * @param householdId - Active household id.
 * @param itemId - Canonical item id.
 * @param input - Validated item patch.
 * @param userId - Acting user id for audit metadata.
 * @returns Updated item payload.
 */
export async function updateCanonicalItem(
	householdId: string,
	itemId: string,
	input: z.infer<typeof itemUpdateBodySchema>,
	userId: number
) {
	const existing = await findItemOrThrow(householdId, itemId)
	const normalizedName =
		input.name === undefined ? existing.normalizedName : normalizeItemName(input.name)

	if (input.name !== undefined && normalizedName !== existing.normalizedName) {
		const [duplicate] = await db
			.select({ id: schema.items.id })
			.from(schema.items)
			.where(
				and(
					eq(schema.items.householdId, householdId),
					eq(schema.items.normalizedName, normalizedName),
					ne(schema.items.id, itemId)
				)
			)
			.limit(1)

		if (duplicate) {
			throwApiError({
				code: 'CONFLICT',
				statusCode: 409,
				message: 'Er bestaat al een item met deze naam.'
			})
		}
	}

	const [item] = await db
		.update(schema.items)
		.set({
			...(input.name === undefined ? {} : { name: input.name, normalizedName }),
			...(input.defaultUnit === undefined ? {} : { defaultUnit: input.defaultUnit }),
			updatedAt: Date.now(),
			updatedByUserId: userId
		})
		.where(and(eq(schema.items.id, itemId), eq(schema.items.householdId, householdId)))
		.returning()

	return { item: serializeSettingsItem(assertRow(item)) }
}

/**
 * Merges one canonical item into another.
 *
 * @param householdId - Active household id.
 * @param sourceItemId - Item id to remove.
 * @param targetItemId - Item id to keep.
 * @returns Merge summary.
 */
export async function mergeCanonicalItem(
	householdId: string,
	sourceItemId: string,
	targetItemId: string
) {
	if (sourceItemId === targetItemId) {
		throwApiError({
			code: 'CONFLICT',
			statusCode: 409,
			message: 'Kies twee verschillende items.'
		})
	}

	await findItemOrThrow(householdId, sourceItemId)
	await findItemOrThrow(householdId, targetItemId)

	await db
		.update(schema.listItems)
		.set({ itemId: targetItemId })
		.where(and(eq(schema.listItems.householdId, householdId), eq(schema.listItems.itemId, sourceItemId)))
	await db
		.update(schema.recipeItems)
		.set({ itemId: targetItemId })
		.where(and(eq(schema.recipeItems.householdId, householdId), eq(schema.recipeItems.itemId, sourceItemId)))
	await db
		.update(schema.mealPlannerDayItems)
		.set({ itemId: targetItemId })
		.where(
			and(
				eq(schema.mealPlannerDayItems.householdId, householdId),
				eq(schema.mealPlannerDayItems.itemId, sourceItemId)
			)
		)
	await db
		.delete(schema.items)
		.where(and(eq(schema.items.id, sourceItemId), eq(schema.items.householdId, householdId)))

	return { mergedItemId: sourceItemId, targetItemId }
}

/**
 * Deletes one canonical item and all item references.
 *
 * @param householdId - Active household id.
 * @param itemId - Item id to delete.
 * @returns Deleted reference counts.
 */
export async function deleteCanonicalItem(householdId: string, itemId: string) {
	await findItemOrThrow(householdId, itemId)
	const usage = await countItemReferences(householdId, itemId)

	await db
		.delete(schema.listItems)
		.where(and(eq(schema.listItems.householdId, householdId), eq(schema.listItems.itemId, itemId)))
	await db
		.delete(schema.recipeItems)
		.where(
			and(eq(schema.recipeItems.householdId, householdId), eq(schema.recipeItems.itemId, itemId))
		)
	await db
		.delete(schema.mealPlannerDayItems)
		.where(
			and(
				eq(schema.mealPlannerDayItems.householdId, householdId),
				eq(schema.mealPlannerDayItems.itemId, itemId)
			)
		)

	await db
		.delete(schema.items)
		.where(and(eq(schema.items.id, itemId), eq(schema.items.householdId, householdId)))

	return {
		deletedItemId: itemId,
		deletedListItems: usage.listItems,
		deletedRecipeItems: usage.recipeItems,
		deletedMealPlannerDayItems: usage.mealPlannerDayItems
	}
}

/**
 * Clears household app data and reseeds the default rows.
 *
 * @param householdId - Active household id.
 * @param userId - Acting user id for seed audit metadata.
 * @returns Operation result.
 */
export async function clearHouseholdData(householdId: string, userId: number) {
	await db.delete(schema.listItems).where(eq(schema.listItems.householdId, householdId))
	await db.delete(schema.recipeItems).where(eq(schema.recipeItems.householdId, householdId))
	await db
		.delete(schema.mealPlannerDayItems)
		.where(eq(schema.mealPlannerDayItems.householdId, householdId))
	await db.delete(schema.mealPlannerDays).where(eq(schema.mealPlannerDays.householdId, householdId))
	await db.delete(schema.recipes).where(eq(schema.recipes.householdId, householdId))
	await db.delete(schema.lists).where(eq(schema.lists.householdId, householdId))
	await db.delete(schema.items).where(eq(schema.items.householdId, householdId))

	await seedInitialDomainData(userId, householdId)

	return { ok: true }
}

/**
 * Builds usage statistics for one household.
 *
 * @param householdId - Active household id.
 * @returns Household statistics payload.
 */
export async function getHouseholdStats(householdId: string) {
	const [totals] = await db
		.select({
			lists: sql<number>`count(distinct ${schema.lists.id})`,
			items: sql<number>`count(distinct ${schema.items.id})`,
			recipes: sql<number>`count(distinct ${schema.recipes.id})`
		})
		.from(schema.items)
		.leftJoin(schema.lists, eq(schema.lists.householdId, schema.items.householdId))
		.leftJoin(schema.recipes, eq(schema.recipes.householdId, schema.items.householdId))
		.where(eq(schema.items.householdId, householdId))

	const [listItems] = await db
		.select({ count: sql<number>`count(*)` })
		.from(schema.listItems)
		.where(eq(schema.listItems.householdId, householdId))

	const mostUsedItems = await db
		.select({
			itemId: schema.items.id,
			name: schema.items.name,
			count: sql<number>`count(${schema.listItems.id})`
		})
		.from(schema.listItems)
		.innerJoin(schema.items, eq(schema.items.id, schema.listItems.itemId))
		.where(eq(schema.listItems.householdId, householdId))
		.groupBy(schema.items.id, schema.items.name)
		.orderBy(desc(sql`count(${schema.listItems.id})`))
		.limit(5)

	const favoriteRecipesByDay = await db
		.select({
			dayOfWeek: schema.mealPlannerDays.dayOfWeek,
			recipeId: schema.recipes.id,
			name: schema.recipes.name
		})
		.from(schema.mealPlannerDays)
		.innerJoin(schema.recipes, eq(schema.recipes.id, schema.mealPlannerDays.recipeId))
		.where(eq(schema.mealPlannerDays.householdId, householdId))
		.orderBy(asc(schema.mealPlannerDays.dayOfWeek))

	return {
		stats: {
			totals: {
				lists: Number(totals?.lists ?? 0),
				items: Number(totals?.items ?? 0),
				recipes: Number(totals?.recipes ?? 0),
				listItems: Number(listItems?.count ?? 0)
			},
			mostUsedItems: mostUsedItems.map((item) => ({
				itemId: item.itemId,
				name: item.name,
				count: Number(item.count)
			})),
			favoriteRecipesByDay
		}
	}
}

function serializeUserProfile(user: {
	id: number
	name: string
	email: string
	avatarPathname: string | null
	createdAt: Date
}) {
	return {
		id: user.id,
		name: user.name,
		email: user.email,
		avatarPathname: optional(user.avatarPathname),
		createdAt: user.createdAt
	}
}

function serializeSettingsItem(item: typeof schema.items.$inferSelect) {
	return {
		id: item.id,
		name: item.name,
		normalizedName: item.normalizedName,
		defaultUnit: optional(item.defaultUnit),
		updatedAt: item.updatedAt
	}
}

async function findItemOrThrow(householdId: string, itemId: string) {
	const [item] = await db
		.select()
		.from(schema.items)
		.where(and(eq(schema.items.id, itemId), eq(schema.items.householdId, householdId)))
		.limit(1)

	if (!item) {
		throwApiError({ code: 'NOT_FOUND', statusCode: 404, message: 'Item niet gevonden.' })
	}

	return item
}

async function getItemUsageCounts(householdId: string) {
	const usage = new Map<string, { total: number; activeListItems: number }>()
	const ensureUsage = (itemId: string) => {
		const existing = usage.get(itemId)

		if (existing) return existing

		const created = { total: 0, activeListItems: 0 }
		usage.set(itemId, created)
		return created
	}
	const addRows = (rows: Array<{ itemId: string; count: number }>) => {
		for (const row of rows) {
			ensureUsage(row.itemId).total += Number(row.count)
		}
	}

	const listRows = await db
		.select({
			itemId: schema.listItems.itemId,
			status: schema.listItems.status,
			count: sql<number>`count(*)`
		})
		.from(schema.listItems)
		.where(eq(schema.listItems.householdId, householdId))
		.groupBy(schema.listItems.itemId, schema.listItems.status)

	for (const row of listRows) {
		const itemUsage = ensureUsage(row.itemId)
		const count = Number(row.count)
		itemUsage.total += count

		if (row.status === 'checked' || row.status === 'unchecked') {
			itemUsage.activeListItems += count
		}
	}

	addRows(
		await db
			.select({ itemId: schema.recipeItems.itemId, count: sql<number>`count(*)` })
			.from(schema.recipeItems)
			.where(eq(schema.recipeItems.householdId, householdId))
			.groupBy(schema.recipeItems.itemId)
	)
	addRows(
		await db
			.select({ itemId: schema.mealPlannerDayItems.itemId, count: sql<number>`count(*)` })
			.from(schema.mealPlannerDayItems)
			.where(eq(schema.mealPlannerDayItems.householdId, householdId))
			.groupBy(schema.mealPlannerDayItems.itemId)
	)

	return usage
}

async function countItemReferences(householdId: string, itemId: string) {
	const [listItems] = await db
		.select({ count: sql<number>`count(*)` })
		.from(schema.listItems)
		.where(and(eq(schema.listItems.householdId, householdId), eq(schema.listItems.itemId, itemId)))
	const [activeListItems] = await db
		.select({ count: sql<number>`count(*)` })
		.from(schema.listItems)
		.where(
			and(
				eq(schema.listItems.householdId, householdId),
				eq(schema.listItems.itemId, itemId),
				inArray(schema.listItems.status, ['checked', 'unchecked'])
			)
		)
	const [recipeItems] = await db
		.select({ count: sql<number>`count(*)` })
		.from(schema.recipeItems)
		.where(
			and(eq(schema.recipeItems.householdId, householdId), eq(schema.recipeItems.itemId, itemId))
		)
	const [dayItems] = await db
		.select({ count: sql<number>`count(*)` })
		.from(schema.mealPlannerDayItems)
		.where(
			and(
				eq(schema.mealPlannerDayItems.householdId, householdId),
				eq(schema.mealPlannerDayItems.itemId, itemId)
			)
		)

	return {
		listItems: Number(listItems?.count ?? 0),
		activeListItems: Number(activeListItems?.count ?? 0),
		recipeItems: Number(recipeItems?.count ?? 0),
		mealPlannerDayItems: Number(dayItems?.count ?? 0)
	}
}

function assertRow<T>(row: T | undefined): T {
	if (!row) {
		throwApiError({ code: 'INTERNAL_ERROR', statusCode: 500, message: 'Er is iets misgegaan.' })
	}

	return row
}
