import type { z } from 'zod'
import type {
	createListBodySchema,
	createOccurrenceBodySchema,
	updateListBodySchema,
	updateListItemBodySchema
} from './schemas'

import { throwApiError } from '#server/utils/api-core'
import { createDomainId } from '#server/utils/api-helpers'
import { and, asc, eq, inArray, ne, sql } from 'drizzle-orm'
import { db, schema } from 'hub:db'

import {
	assertRow,
	auditFields,
	createAudit,
	findListItemOrThrow,
	findListOrThrow,
	getNextListItemPosition,
	getNextListPosition,
	serializeList,
	serializeListItem
} from './base'
import { findOrCreateItem } from './items'

/**
 * Lists shopping lists by status.
 *
 * @param status - List status to include.
 * @returns Ordered lists.
 */
export async function listShoppingLists(status: schema.ListStatus) {
	const rows = await db
		.select()
		.from(schema.lists)
		.where(eq(schema.lists.status, status))
		.orderBy(asc(schema.lists.position), asc(schema.lists.createdAt))

	return {
		lists: rows.map(serializeList)
	}
}

/**
 * Creates a reusable shopping list.
 *
 * @param input - Validated list creation payload.
 * @param userId - Audit user id.
 * @returns Created list.
 */
export async function createShoppingList(
	input: z.infer<typeof createListBodySchema>,
	userId: number
) {
	const audit = createAudit(userId)
	const position = await getNextListPosition()
	const [list] = await db
		.insert(schema.lists)
		.values({
			id: createDomainId(),
			name: input.name,
			icon: input.icon ?? null,
			status: 'active',
			position,
			archivedAt: null,
			deletedAt: null,
			...auditFields(audit)
		})
		.returning()

	return {
		list: serializeList(assertRow(list))
	}
}

/**
 * Reorders active shopping lists.
 *
 * @param orderedIds - Ordered list ids.
 * @param userId - Audit user id.
 * @returns Updated list positions.
 */
export async function reorderShoppingLists(orderedIds: string[], userId: number) {
	const audit = createAudit(userId)
	const updated = []

	for (const [position, id] of orderedIds.entries()) {
		const [list] = await db
			.update(schema.lists)
			.set({
				position,
				updatedAt: audit.now,
				updatedByUserId: audit.userId
			})
			.where(and(eq(schema.lists.id, id), eq(schema.lists.status, 'active')))
			.returning({ id: schema.lists.id, position: schema.lists.position })

		if (list) {
			updated.push(list)
		}
	}

	return { lists: updated }
}

/**
 * Returns one list with visible list items.
 *
 * @param listId - List id.
 * @returns List detail.
 */
export async function getShoppingList(listId: string) {
	const list = await findListOrThrow(listId)
	const rows = await db
		.select({
			listItem: schema.listItems,
			item: schema.items
		})
		.from(schema.listItems)
		.innerJoin(schema.items, eq(schema.items.id, schema.listItems.itemId))
		.where(
			and(
				eq(schema.listItems.listId, listId),
				inArray(schema.listItems.status, ['unchecked', 'checked'])
			)
		)
		.orderBy(asc(schema.listItems.position), asc(schema.listItems.createdAt))

	return {
		list: {
			...serializeList(list),
			items: rows.map((row) => serializeListItem(row.listItem, row.item))
		}
	}
}

/**
 * Updates list metadata.
 *
 * @param listId - List id.
 * @param input - Validated update payload.
 * @param userId - Audit user id.
 * @returns Updated list.
 */
export async function updateShoppingList(
	listId: string,
	input: z.infer<typeof updateListBodySchema>,
	userId: number
) {
	await findListOrThrow(listId)
	const audit = createAudit(userId)
	const [list] = await db
		.update(schema.lists)
		.set({
			...(input.name === undefined ? {} : { name: input.name }),
			...(input.icon === undefined ? {} : { icon: input.icon }),
			updatedAt: audit.now,
			updatedByUserId: audit.userId
		})
		.where(eq(schema.lists.id, listId))
		.returning()

	return { list: serializeList(assertRow(list)) }
}

/**
 * Archives a shopping list.
 *
 * @param listId - List id.
 * @param userId - Audit user id.
 * @returns Archived list summary.
 */
export async function archiveShoppingList(listId: string, userId: number) {
	await findListOrThrow(listId)
	const audit = createAudit(userId)
	const [list] = await db
		.update(schema.lists)
		.set({
			status: 'archived',
			archivedAt: audit.now,
			updatedAt: audit.now,
			updatedByUserId: audit.userId
		})
		.where(eq(schema.lists.id, listId))
		.returning()

	const archived = assertRow(list)
	return {
		list: {
			id: archived.id,
			status: archived.status,
			archivedAt: archived.archivedAt
		}
	}
}

/**
 * Soft-deletes a shopping list.
 *
 * @param listId - List id.
 * @param userId - Audit user id.
 * @returns Deleted list summary.
 */
export async function deleteShoppingList(listId: string, userId: number) {
	await findListOrThrow(listId)
	const [remainingLists] = await db
		.select({ count: sql<number>`count(*)` })
		.from(schema.lists)
		.where(ne(schema.lists.status, 'deleted'))

	if (Number(remainingLists?.count ?? 0) <= 1) {
		throwApiError({
			code: 'CONFLICT',
			statusCode: 409,
			message: 'Minimaal één lijst moet behouden blijven.'
		})
	}

	const audit = createAudit(userId)
	const [list] = await db
		.update(schema.lists)
		.set({
			status: 'deleted',
			deletedAt: audit.now,
			updatedAt: audit.now,
			updatedByUserId: audit.userId
		})
		.where(eq(schema.lists.id, listId))
		.returning()

	const deleted = assertRow(list)
	return {
		list: {
			id: deleted.id,
			status: deleted.status,
			deletedAt: deleted.deletedAt
		}
	}
}

/**
 * Archives visible list items for a list.
 *
 * @param listId - List id.
 * @param userId - Audit user id.
 * @returns Number of archived items.
 */
export async function clearShoppingList(listId: string, userId: number) {
	await findListOrThrow(listId)
	const audit = createAudit(userId)
	const rows = await db
		.update(schema.listItems)
		.set({
			status: 'archived',
			archivedAt: audit.now,
			archivedByUserId: audit.userId,
			updatedAt: audit.now,
			updatedByUserId: audit.userId
		})
		.where(
			and(
				eq(schema.listItems.listId, listId),
				inArray(schema.listItems.status, ['unchecked', 'checked'])
			)
		)
		.returning({ id: schema.listItems.id })

	return { archivedCount: rows.length }
}

/**
 * Adds a manual item occurrence to a shopping list.
 *
 * @param listId - List id.
 * @param input - Validated item input.
 * @param userId - Audit user id.
 * @returns Created list item.
 */
export async function addListItem(
	listId: string,
	input: z.infer<typeof createOccurrenceBodySchema>,
	userId: number
) {
	await findListOrThrow(listId)
	const audit = createAudit(userId)
	const item = await findOrCreateItem({ name: input.name, auditUserId: userId })
	const position = await getNextListItemPosition(listId)
	const [listItem] = await db
		.insert(schema.listItems)
		.values({
			id: createDomainId(),
			listId,
			itemId: item.id,
			status: 'unchecked',
			position,
			amount: input.amount ?? null,
			unit: input.unit ?? null,
			note: input.note ?? null,
			sourceType: 'manual',
			sourceRecipeId: null,
			sourceMealPlannerDayId: null,
			checkedAt: null,
			checkedByUserId: null,
			archivedAt: null,
			archivedByUserId: null,
			deletedAt: null,
			deletedByUserId: null,
			...auditFields(audit)
		})
		.returning()

	return { listItem: serializeListItem(assertRow(listItem), item) }
}

/**
 * Reorders visible list items for a list.
 *
 * @param listId - List id.
 * @param orderedIds - Ordered visible list item ids.
 * @param userId - Audit user id.
 * @returns Updated item positions.
 */
export async function reorderListItems(listId: string, orderedIds: string[], userId: number) {
	await findListOrThrow(listId)
	const audit = createAudit(userId)
	const updated = []

	for (const [position, id] of orderedIds.entries()) {
		const [row] = await db
			.update(schema.listItems)
			.set({
				position,
				updatedAt: audit.now,
				updatedByUserId: audit.userId
			})
			.where(
				and(
					eq(schema.listItems.id, id),
					eq(schema.listItems.listId, listId),
					inArray(schema.listItems.status, ['unchecked', 'checked'])
				)
			)
			.returning({ id: schema.listItems.id, position: schema.listItems.position })

		if (row) {
			updated.push(row)
		}
	}

	return { items: updated }
}

/**
 * Updates list item occurrence metadata.
 *
 * @param listItemId - List item id.
 * @param input - Validated update payload.
 * @param userId - Audit user id.
 * @returns Updated list item fields.
 */
export async function updateListItem(
	listItemId: string,
	input: z.infer<typeof updateListItemBodySchema>,
	userId: number
) {
	const existingListItem = await findListItemOrThrow(listItemId)
	const audit = createAudit(userId)
	const nextListId = input.listId ?? existingListItem.listId
	const isMovingList = nextListId !== existingListItem.listId

	if (isMovingList) {
		await findListOrThrow(nextListId)
	}

	const item =
		input.name === undefined
			? assertRow(
					(
						await db
							.select()
							.from(schema.items)
							.where(eq(schema.items.id, existingListItem.itemId))
							.limit(1)
					)[0]
				)
			: await findOrCreateItem({ name: input.name, auditUserId: userId })

	const [row] = await db
		.update(schema.listItems)
		.set({
			...(input.name === undefined ? {} : { itemId: item.id }),
			...(isMovingList
				? {
						listId: nextListId,
						position: await getNextListItemPosition(nextListId)
					}
				: {}),
			...(input.amount === undefined ? {} : { amount: input.amount }),
			...(input.unit === undefined ? {} : { unit: input.unit }),
			...(input.note === undefined ? {} : { note: input.note }),
			updatedAt: audit.now,
			updatedByUserId: audit.userId
		})
		.where(eq(schema.listItems.id, listItemId))
		.returning()

	return {
		listItem: serializeListItem(assertRow(row), item)
	}
}

/**
 * Marks a visible list item checked.
 *
 * @param listItemId - List item id.
 * @param userId - Audit user id.
 * @returns Checked list item summary.
 */
export async function checkListItem(listItemId: string, userId: number) {
	await findListItemOrThrow(listItemId)
	const audit = createAudit(userId)
	const [row] = await db
		.update(schema.listItems)
		.set({
			status: 'checked',
			checkedAt: audit.now,
			checkedByUserId: audit.userId,
			updatedAt: audit.now,
			updatedByUserId: audit.userId
		})
		.where(eq(schema.listItems.id, listItemId))
		.returning()

	const listItem = assertRow(row)
	return { listItem: { id: listItem.id, status: listItem.status, checkedAt: listItem.checkedAt } }
}

/**
 * Marks a checked list item unchecked.
 *
 * @param listItemId - List item id.
 * @param userId - Audit user id.
 * @returns Unchecked list item summary.
 */
export async function uncheckListItem(listItemId: string, userId: number) {
	await findListItemOrThrow(listItemId)
	const audit = createAudit(userId)
	const [row] = await db
		.update(schema.listItems)
		.set({
			status: 'unchecked',
			checkedAt: null,
			checkedByUserId: null,
			updatedAt: audit.now,
			updatedByUserId: audit.userId
		})
		.where(eq(schema.listItems.id, listItemId))
		.returning()

	const listItem = assertRow(row)
	return { listItem: { id: listItem.id, status: listItem.status } }
}

/**
 * Soft-deletes a list item.
 *
 * @param listItemId - List item id.
 * @param userId - Audit user id.
 * @returns Deleted list item summary.
 */
export async function deleteListItem(listItemId: string, userId: number) {
	await findListItemOrThrow(listItemId)
	const audit = createAudit(userId)
	const [row] = await db
		.update(schema.listItems)
		.set({
			status: 'deleted',
			deletedAt: audit.now,
			deletedByUserId: audit.userId,
			updatedAt: audit.now,
			updatedByUserId: audit.userId
		})
		.where(eq(schema.listItems.id, listItemId))
		.returning()

	const listItem = assertRow(row)
	return { listItem: { id: listItem.id, status: listItem.status, deletedAt: listItem.deletedAt } }
}
