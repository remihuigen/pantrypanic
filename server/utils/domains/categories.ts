import type {
	createCategoryBodySchema,
	mergeCategoryBodySchema,
	updateCategoryBodySchema
} from './schemas'

import { throwApiError } from '#server/utils/api-core'
import { createDomainId } from '#server/utils/api-helpers'
import { and, asc, eq, like, ne, or, sql } from 'drizzle-orm'
import { db, schema } from 'hub:db'
import { z } from 'zod'

import { assertRow, auditFields, createAudit, serializeItemCategory } from './base'

export const categoryListQuerySchema = z.strictObject({
	q: z.string().trim().max(120).optional()
})

/**
 * Normalizes a category name for duplicate detection.
 *
 * @param name - User-entered category name.
 * @returns Lowercase category name with collapsed whitespace.
 */
export function normalizeCategoryName(name: string) {
	return name.trim().replaceAll(/\s+/g, ' ').toLowerCase()
}

/**
 * Lists household item categories.
 *
 * @param householdId - Active household id.
 * @param query - Optional search query.
 * @returns Ordered category rows with usage counts.
 */
export async function listItemCategories(
	householdId: string,
	query: z.infer<typeof categoryListQuerySchema> = {}
) {
	const normalized = query.q ? `%${normalizeCategoryName(query.q)}%` : undefined
	const rows = await db
		.select()
		.from(schema.itemCategories)
		.where(
			and(
				eq(schema.itemCategories.householdId, householdId),
				normalized === undefined
					? undefined
					: or(
							like(sql`lower(${schema.itemCategories.name})`, normalized),
							like(schema.itemCategories.normalizedName, normalized)
						)
			)
		)
		.orderBy(asc(schema.itemCategories.name))

	const usage = await getCategoryUsageCounts(householdId)

	return {
		categories: rows.map((category) => {
			const counts = usage.get(category.id)

			return {
				...serializeItemCategory(category),
				usageCount: (counts?.items ?? 0) + (counts?.listItems ?? 0),
				itemUsageCount: counts?.items ?? 0,
				listItemUsageCount: counts?.listItems ?? 0
			}
		})
	}
}

/**
 * Creates a household item category.
 *
 * @param householdId - Active household id.
 * @param input - Validated category input.
 * @param userId - Acting user id.
 * @returns Created category.
 */
export async function createItemCategory(
	householdId: string,
	input: z.infer<typeof createCategoryBodySchema>,
	userId: number
) {
	const normalizedName = normalizeCategoryName(input.name)
	await ensureCategoryNameAvailable(householdId, normalizedName)
	const audit = createAudit(userId)
	const [category] = await db
		.insert(schema.itemCategories)
		.values({
			id: createDomainId(),
			householdId,
			name: input.name,
			normalizedName,
			...auditFields(audit)
		})
		.returning()

	return { category: serializeItemCategory(assertRow(category)) }
}

/**
 * Updates one household item category.
 *
 * @param householdId - Active household id.
 * @param categoryId - Category id.
 * @param input - Validated category patch.
 * @param userId - Acting user id.
 * @returns Updated category.
 */
export async function updateItemCategory(
	householdId: string,
	categoryId: string,
	input: z.infer<typeof updateCategoryBodySchema>,
	userId: number
) {
	const existing = await findCategoryOrThrow(householdId, categoryId)
	const normalizedName =
		input.name === undefined ? existing.normalizedName : normalizeCategoryName(input.name)

	if (normalizedName !== existing.normalizedName) {
		await ensureCategoryNameAvailable(householdId, normalizedName, categoryId)
	}

	const [category] = await db
		.update(schema.itemCategories)
		.set({
			...(input.name === undefined ? {} : { name: input.name, normalizedName }),
			updatedAt: Date.now(),
			updatedByUserId: userId
		})
		.where(
			and(
				eq(schema.itemCategories.id, categoryId),
				eq(schema.itemCategories.householdId, householdId)
			)
		)
		.returning()

	return { category: serializeItemCategory(assertRow(category)) }
}

/**
 * Merges one category into another and deletes the source category.
 *
 * @param householdId - Active household id.
 * @param sourceCategoryId - Category id to remove.
 * @param input - Merge target payload.
 * @returns Merge summary.
 */
export async function mergeItemCategory(
	householdId: string,
	sourceCategoryId: string,
	input: z.infer<typeof mergeCategoryBodySchema>
) {
	if (sourceCategoryId === input.targetCategoryId) {
		throwApiError({
			code: 'CONFLICT',
			statusCode: 409,
			message: 'Kies twee verschillende categorieën.'
		})
	}

	await findCategoryOrThrow(householdId, sourceCategoryId)
	await findCategoryOrThrow(householdId, input.targetCategoryId)

	await db
		.update(schema.items)
		.set({ categoryId: input.targetCategoryId })
		.where(
			and(
				eq(schema.items.householdId, householdId),
				eq(schema.items.categoryId, sourceCategoryId)
			)
		)
	await db
		.update(schema.listItems)
		.set({ categoryId: input.targetCategoryId })
		.where(
			and(
				eq(schema.listItems.householdId, householdId),
				eq(schema.listItems.categoryId, sourceCategoryId)
			)
		)
	await db
		.delete(schema.listCategoryPositions)
		.where(
			and(
				eq(schema.listCategoryPositions.householdId, householdId),
				eq(schema.listCategoryPositions.categoryId, sourceCategoryId)
			)
		)
	await db
		.delete(schema.itemCategories)
		.where(
			and(
				eq(schema.itemCategories.id, sourceCategoryId),
				eq(schema.itemCategories.householdId, householdId)
			)
		)

	return { mergedCategoryId: sourceCategoryId, targetCategoryId: input.targetCategoryId }
}

/**
 * Deletes a category and clears all references to it.
 *
 * @param householdId - Active household id.
 * @param categoryId - Category id to delete.
 * @returns Deleted category id.
 */
export async function deleteItemCategory(householdId: string, categoryId: string) {
	await findCategoryOrThrow(householdId, categoryId)
	await db
		.update(schema.items)
		.set({ categoryId: null })
		.where(
			and(eq(schema.items.householdId, householdId), eq(schema.items.categoryId, categoryId))
		)
	await db
		.update(schema.listItems)
		.set({ categoryId: null })
		.where(
			and(
				eq(schema.listItems.householdId, householdId),
				eq(schema.listItems.categoryId, categoryId)
			)
		)
	await db
		.delete(schema.listCategoryPositions)
		.where(
			and(
				eq(schema.listCategoryPositions.householdId, householdId),
				eq(schema.listCategoryPositions.categoryId, categoryId)
			)
		)
	await db
		.delete(schema.itemCategories)
		.where(
			and(
				eq(schema.itemCategories.id, categoryId),
				eq(schema.itemCategories.householdId, householdId)
			)
		)

	return { deletedCategoryId: categoryId }
}

/**
 * Finds a category in a household or throws a not-found API error.
 *
 * @param householdId - Active household id.
 * @param categoryId - Category id.
 * @returns Category row.
 */
export async function findCategoryOrThrow(householdId: string, categoryId: string) {
	const [category] = await db
		.select()
		.from(schema.itemCategories)
		.where(
			and(
				eq(schema.itemCategories.id, categoryId),
				eq(schema.itemCategories.householdId, householdId)
			)
		)
		.limit(1)

	if (!category) {
		throwApiError({ code: 'NOT_FOUND', statusCode: 404, message: 'Categorie niet gevonden.' })
	}

	return category
}

async function ensureCategoryNameAvailable(
	householdId: string,
	normalizedName: string,
	ignoredCategoryId?: string
) {
	const [duplicate] = await db
		.select({ id: schema.itemCategories.id })
		.from(schema.itemCategories)
		.where(
			and(
				eq(schema.itemCategories.householdId, householdId),
				eq(schema.itemCategories.normalizedName, normalizedName),
				ignoredCategoryId ? ne(schema.itemCategories.id, ignoredCategoryId) : undefined
			)
		)
		.limit(1)

	if (duplicate) {
		throwApiError({
			code: 'CONFLICT',
			statusCode: 409,
			message: 'Er bestaat al een categorie met deze naam.'
		})
	}
}

async function getCategoryUsageCounts(householdId: string) {
	const usage = new Map<string, { items: number; listItems: number }>()
	const ensureUsage = (categoryId: string) => {
		const existing = usage.get(categoryId)

		if (existing) return existing

		const created = { items: 0, listItems: 0 }
		usage.set(categoryId, created)
		return created
	}

	const itemRows = await db
		.select({ categoryId: schema.items.categoryId, count: sql<number>`count(*)` })
		.from(schema.items)
		.where(eq(schema.items.householdId, householdId))
		.groupBy(schema.items.categoryId)

	for (const row of itemRows) {
		if (row.categoryId) {
			ensureUsage(row.categoryId).items += Number(row.count)
		}
	}

	const listItemRows = await db
		.select({ categoryId: schema.listItems.categoryId, count: sql<number>`count(*)` })
		.from(schema.listItems)
		.where(eq(schema.listItems.householdId, householdId))
		.groupBy(schema.listItems.categoryId)

	for (const row of listItemRows) {
		if (row.categoryId) {
			ensureUsage(row.categoryId).listItems += Number(row.count)
		}
	}

	return usage
}
