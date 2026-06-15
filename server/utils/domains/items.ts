import type { ItemRow } from './base'
import type { ItemSearchQuery, ItemSuggestionsQuery } from './schemas'

import { createDomainId } from '#server/utils/api-helpers'
import { and, asc, eq, like, or, sql } from 'drizzle-orm'
import { db, schema } from 'hub:db'

import { serializeItem } from './base'

type CreateItemInput = {
	householdId?: string
	name: string
	defaultUnit?: string | null
	categoryId?: string | null
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
 * @param householdId - Household id.
 * @param normalizedName - Normalized item name to look up.
 * @returns Existing item row, or undefined when missing.
 */
export async function findItemByNormalizedName(householdId: string, normalizedName?: string) {
	const resolvedHouseholdId = normalizedName === undefined ? 'household-1' : householdId
	const resolvedNormalizedName = normalizedName ?? householdId
	const [item] = await db
		.select()
		.from(schema.items)
		.where(
			and(
				eq(schema.items.householdId, resolvedHouseholdId),
				eq(schema.items.normalizedName, resolvedNormalizedName)
			)
		)
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
	const householdId = input.householdId ?? 'household-1'
	const normalizedName = normalizeItemName(input.name)
	const existing = await findItemByNormalizedName(householdId, normalizedName)

	if (existing) {
		return existing
	}

	const now = Date.now()

	try {
		const [item] = await db
			.insert(schema.items)
			.values({
				id: createDomainId(),
				householdId,
				name: input.name.trim(),
				normalizedName,
				defaultUnit: input.defaultUnit ?? null,
				categoryId: input.categoryId ?? null,
				createdAt: now,
				updatedAt: now,
				createdByUserId: input.auditUserId,
				updatedByUserId: input.auditUserId
			})
			.returning()

		return assertReturnedRow(item, 'Item insert did not return a row.')
	} catch (error) {
		const item = await findItemByNormalizedName(householdId, normalizedName)

		if (item) {
			return item
		}

		throw error
	}
}

/**
 * Stores a list-item category as the canonical default category when one is assigned.
 *
 * @param item - Related canonical item row.
 * @param categoryId - Assigned list-item category.
 * @param auditUserId - Acting user id.
 */
export async function applyAssignedCategoryToItem(
	item: ItemRow,
	categoryId: string | null | undefined,
	auditUserId: number
) {
	if (!categoryId || item.categoryId === categoryId) {
		return
	}

	await db
		.update(schema.items)
		.set({
			categoryId,
			updatedAt: Date.now(),
			updatedByUserId: auditUserId
		})
		.where(and(eq(schema.items.id, item.id), eq(schema.items.householdId, item.householdId)))
}

/**
 * Stores a list-item unit as the canonical default unit when one is assigned.
 *
 * @param item - Related canonical item row.
 * @param unit - Assigned list-item unit.
 * @param auditUserId - Acting user id.
 */
export async function applyAssignedUnitToItem(
	item: ItemRow,
	unit: string | null | undefined,
	auditUserId: number
) {
	const defaultUnit = unit?.trim()

	if (!defaultUnit || item.defaultUnit === defaultUnit) {
		return
	}

	await db
		.update(schema.items)
		.set({
			defaultUnit,
			updatedAt: Date.now(),
			updatedByUserId: auditUserId
		})
		.where(and(eq(schema.items.id, item.id), eq(schema.items.householdId, item.householdId)))
}

/**
 * Searches canonical items by name.
 *
 * @param householdId - Household id.
 * @param query - Search query.
 * @returns Matching canonical items.
 */
export async function searchItems(householdId: string | ItemSearchQuery, query?: ItemSearchQuery) {
	const resolvedHouseholdId = typeof householdId === 'string' ? householdId : 'household-1'
	const resolvedQuery = query ?? (householdId as ItemSearchQuery)
	const normalized = normalizeItemName(resolvedQuery.q)
	const pattern = `%${normalized}%`
	const rows = await db
		.select({
			item: schema.items,
			category: schema.itemCategories
		})
		.from(schema.items)
		.leftJoin(schema.itemCategories, eq(schema.itemCategories.id, schema.items.categoryId))
		.where(
			and(
				eq(schema.items.householdId, resolvedHouseholdId),
				or(
					like(schema.items.normalizedName, pattern),
					like(sql`lower(${schema.items.name})`, pattern)
				)
			)
		)
		.orderBy(asc(schema.items.name))
		.limit(resolvedQuery.limit)

	return { items: rows.map((row) => serializeItem(row.item, row.category)) }
}

/**
 * Returns frequently used archived list items as suggestions.
 *
 * @param householdId - Household id.
 * @param query - Suggestion query.
 * @returns Item suggestions.
 */
export async function suggestItems(
	householdId: string | ItemSuggestionsQuery,
	query?: ItemSuggestionsQuery
) {
	const resolvedHouseholdId = typeof householdId === 'string' ? householdId : 'household-1'
	const resolvedQuery = query ?? (householdId as ItemSuggestionsQuery)
	const rows = await db
		.select({
			listItem: schema.listItems,
			item: schema.items,
			category: schema.itemCategories
		})
		.from(schema.listItems)
		.innerJoin(schema.items, eq(schema.items.id, schema.listItems.itemId))
		.leftJoin(schema.itemCategories, eq(schema.itemCategories.id, schema.items.categoryId))
		.where(
			and(
				eq(schema.listItems.householdId, resolvedHouseholdId),
				eq(schema.listItems.status, 'archived'),
				resolvedQuery.listId === undefined
					? undefined
					: eq(schema.listItems.listId, resolvedQuery.listId)
			)
		)

	const byItem = new Map<
		string,
		{
			item: ItemRow
			category?: typeof schema.itemCategories.$inferSelect | null
			usageCount: number
			lastUsedAt?: number
		}
	>()

	for (const row of rows) {
		const existing = byItem.get(row.item.id)
		const archivedAt = row.listItem.archivedAt ?? undefined

		if (!existing) {
			byItem.set(row.item.id, {
				item: row.item,
				category: row.category,
				usageCount: 1,
				lastUsedAt: archivedAt
			})
			continue
		}

		existing.usageCount += 1
		existing.lastUsedAt = Math.max(existing.lastUsedAt ?? 0, archivedAt ?? 0) || undefined
	}

	return {
		items: [...byItem.values()]
			.sort(
				(left, right) =>
					right.usageCount - left.usageCount ||
					(right.lastUsedAt ?? 0) - (left.lastUsedAt ?? 0)
			)
			.slice(0, resolvedQuery.limit)
			.map((entry) => ({
				...serializeItem(entry.item, entry.category),
				usageCount: entry.usageCount,
				lastUsedAt: entry.lastUsedAt
			}))
	}
}

function assertReturnedRow<T>(row: T | undefined, message: string): T {
	if (!row) {
		throw new Error(message)
	}

	return row
}
