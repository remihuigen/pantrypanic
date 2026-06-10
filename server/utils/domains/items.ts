import type { ItemRow } from './base'
import type { ItemSearchQuery, ItemSuggestionsQuery } from './schemas'

import { createDomainId } from '#server/utils/api-helpers'
import { and, asc, eq, like, or, sql } from 'drizzle-orm'
import { db, schema } from 'hub:db'

import { serializeItem } from './base'

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
 * Searches canonical items by name.
 *
 * @param query - Search query.
 * @returns Matching canonical items.
 */
export async function searchItems(query: ItemSearchQuery) {
	const normalized = normalizeItemName(query.q)
	const pattern = `%${normalized}%`
	const rows = await db
		.select()
		.from(schema.items)
		.where(
			or(
				like(schema.items.normalizedName, pattern),
				like(sql`lower(${schema.items.name})`, pattern)
			)
		)
		.orderBy(asc(schema.items.name))
		.limit(query.limit)

	return { items: rows.map(serializeItem) }
}

/**
 * Returns frequently used archived list items as suggestions.
 *
 * @param query - Suggestion query.
 * @returns Item suggestions.
 */
export async function suggestItems(query: ItemSuggestionsQuery) {
	const rows = await db
		.select({
			listItem: schema.listItems,
			item: schema.items
		})
		.from(schema.listItems)
		.innerJoin(schema.items, eq(schema.items.id, schema.listItems.itemId))
		.where(
			and(
				eq(schema.listItems.status, 'archived'),
				query.listId === undefined ? undefined : eq(schema.listItems.listId, query.listId)
			)
		)

	const byItem = new Map<string, { item: ItemRow; usageCount: number; lastUsedAt?: number }>()

	for (const row of rows) {
		const existing = byItem.get(row.item.id)
		const archivedAt = row.listItem.archivedAt ?? undefined

		if (!existing) {
			byItem.set(row.item.id, {
				item: row.item,
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
			.slice(0, query.limit)
			.map((entry) => ({
				...serializeItem(entry.item),
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
