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

const DEFAULT_HOUSEHOLD_ID = 'household-1'

/**
 * Lists shopping lists by status.
 *
 * @param householdId - Household id.
 * @param status - List status to include.
 * @returns Ordered lists.
 */
export async function listShoppingLists(
	householdId: string | schema.ListStatus,
	status?: schema.ListStatus
) {
	const resolvedHouseholdId = status === undefined ? DEFAULT_HOUSEHOLD_ID : householdId
	const resolvedStatus = status ?? (householdId as schema.ListStatus)
	const rows = await db
		.select()
		.from(schema.lists)
		.where(
			and(
				eq(schema.lists.householdId, resolvedHouseholdId),
				eq(schema.lists.status, resolvedStatus)
			)
		)
		.orderBy(asc(schema.lists.position), asc(schema.lists.createdAt))

	return {
		lists: rows.map(serializeList)
	}
}

/**
 * Creates a reusable shopping list.
 *
 * @param householdId - Household id.
 * @param input - Validated list creation payload.
 * @param userId - Audit user id.
 * @returns Created list.
 */
export async function createShoppingList(
	householdId: string | z.infer<typeof createListBodySchema>,
	input: z.infer<typeof createListBodySchema> | number,
	userId?: number
) {
	const resolvedHouseholdId = typeof householdId === 'string' ? householdId : DEFAULT_HOUSEHOLD_ID
	const resolvedInput =
		typeof householdId === 'string' ? (input as z.infer<typeof createListBodySchema>) : householdId
	const resolvedUserId = typeof householdId === 'string' ? Number(userId) : Number(input)
	const audit = createAudit(resolvedUserId)
	const position = await getNextListPosition(resolvedHouseholdId)
	const [list] = await db
		.insert(schema.lists)
		.values({
			id: createDomainId(),
			householdId: resolvedHouseholdId,
			name: resolvedInput.name,
			icon: resolvedInput.icon ?? null,
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
 * @param householdId - Household id.
 * @param orderedIds - Ordered list ids.
 * @param userId - Audit user id.
 * @returns Updated list positions.
 */
export async function reorderShoppingLists(
	householdId: string | string[],
	orderedIds: string[] | number,
	userId?: number
) {
	const resolvedHouseholdId = Array.isArray(householdId) ? DEFAULT_HOUSEHOLD_ID : householdId
	const resolvedOrderedIds = Array.isArray(householdId) ? householdId : (orderedIds as string[])
	const resolvedUserId = Array.isArray(householdId) ? Number(orderedIds) : Number(userId)
	const audit = createAudit(resolvedUserId)
	const updated = []

	for (const [position, id] of resolvedOrderedIds.entries()) {
		const [list] = await db
			.update(schema.lists)
			.set({
				position,
				updatedAt: audit.now,
				updatedByUserId: audit.userId
			})
			.where(
				and(
					eq(schema.lists.id, id),
					eq(schema.lists.householdId, resolvedHouseholdId),
					eq(schema.lists.status, 'active')
				)
			)
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
 * @param householdId - Household id.
 * @param listId - List id.
 * @returns List detail.
 */
export async function getShoppingList(householdId: string, listId?: string) {
	const resolvedHouseholdId = listId === undefined ? DEFAULT_HOUSEHOLD_ID : householdId
	const resolvedListId = listId ?? householdId
	const list = await findListOrThrow(resolvedListId, resolvedHouseholdId)
	const rows = await db
		.select({
			listItem: schema.listItems,
			item: schema.items
		})
		.from(schema.listItems)
		.innerJoin(schema.items, eq(schema.items.id, schema.listItems.itemId))
		.where(
			and(
				eq(schema.listItems.listId, resolvedListId),
				eq(schema.listItems.householdId, resolvedHouseholdId),
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
 * @param householdId - Household id.
 * @param listId - List id.
 * @param input - Validated update payload.
 * @param userId - Audit user id.
 * @returns Updated list.
 */
export async function updateShoppingList(
	householdId: string,
	listId: string,
	input: z.infer<typeof updateListBodySchema>,
	userId: number
) {
	await findListOrThrow(listId, householdId)
	const audit = createAudit(userId)
	const [list] = await db
		.update(schema.lists)
		.set({
			...(input.name === undefined ? {} : { name: input.name }),
			...(input.icon === undefined ? {} : { icon: input.icon }),
			updatedAt: audit.now,
			updatedByUserId: audit.userId
		})
		.where(and(eq(schema.lists.id, listId), eq(schema.lists.householdId, householdId)))
		.returning()

	return { list: serializeList(assertRow(list)) }
}

/**
 * Archives a shopping list.
 *
 * @param householdId - Household id.
 * @param listId - List id.
 * @param userId - Audit user id.
 * @returns Archived list summary.
 */
export async function archiveShoppingList(householdId: string, listId: string, userId: number) {
	await findListOrThrow(listId, householdId)
	const audit = createAudit(userId)
	const [list] = await db
		.update(schema.lists)
		.set({
			status: 'archived',
			archivedAt: audit.now,
			updatedAt: audit.now,
			updatedByUserId: audit.userId
		})
		.where(and(eq(schema.lists.id, listId), eq(schema.lists.householdId, householdId)))
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
 * @param householdId - Household id.
 * @param listId - List id.
 * @param userId - Audit user id.
 * @returns Deleted list summary.
 */
export async function deleteShoppingList(householdId: string, listId: string, userId: number) {
	await findListOrThrow(listId, householdId)
	const [remainingLists] = await db
		.select({ count: sql<number>`count(*)` })
		.from(schema.lists)
		.where(and(eq(schema.lists.householdId, householdId), ne(schema.lists.status, 'deleted')))

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
		.where(and(eq(schema.lists.id, listId), eq(schema.lists.householdId, householdId)))
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
 * @param householdId - Household id.
 * @param listId - List id.
 * @param userId - Audit user id.
 * @returns Number of archived items.
 */
export async function clearShoppingList(householdId: string, listId: string, userId: number) {
	await findListOrThrow(listId, householdId)
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
				eq(schema.listItems.householdId, householdId),
				inArray(schema.listItems.status, ['unchecked', 'checked'])
			)
		)
		.returning({ id: schema.listItems.id })

	return { archivedCount: rows.length }
}

/**
 * Archives checked list items for a list.
 *
 * @param householdId - Household id.
 * @param listId - List id.
 * @param userId - Audit user id.
 * @returns Number of archived checked items.
 */
export async function clearCheckedListItems(householdId: string, listId: string, userId: number) {
	await findListOrThrow(listId, householdId)
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
				eq(schema.listItems.householdId, householdId),
				eq(schema.listItems.status, 'checked')
			)
		)
		.returning({ id: schema.listItems.id })

	return { archivedCount: rows.length }
}

/**
 * Adds a manual item occurrence to a shopping list.
 *
 * @param householdId - Household id.
 * @param listId - List id.
 * @param input - Validated item input.
 * @param userId - Audit user id.
 * @returns Created list item.
 */
export async function addListItem(
	householdId: string,
	listId: string,
	input: z.infer<typeof createOccurrenceBodySchema>,
	userId: number
) {
	await findListOrThrow(listId, householdId)
	const audit = createAudit(userId)
	const item = await findOrCreateItem({ householdId, name: input.name, auditUserId: userId })
	const position = await getNextListItemPosition(listId, householdId)
	const [listItem] = await db
		.insert(schema.listItems)
		.values({
			id: createDomainId(),
			householdId,
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
 * @param householdId - Household id.
 * @param listId - List id.
 * @param orderedIds - Ordered visible list item ids.
 * @param userId - Audit user id.
 * @returns Updated item positions.
 */
export async function reorderListItems(
	householdId: string,
	listId: string | string[],
	orderedIds: string[] | number,
	userId?: number
) {
	const isLegacyCall = Array.isArray(listId)
	const resolvedHouseholdId = isLegacyCall ? DEFAULT_HOUSEHOLD_ID : householdId
	const resolvedListId = isLegacyCall ? householdId : (listId as string)
	const resolvedOrderedIds = isLegacyCall ? listId : (orderedIds as string[])
	const resolvedUserId = isLegacyCall ? Number(orderedIds) : Number(userId)
	await findListOrThrow(resolvedListId, resolvedHouseholdId)
	const audit = createAudit(resolvedUserId)
	const updated = []

	for (const [position, id] of resolvedOrderedIds.entries()) {
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
					eq(schema.listItems.listId, resolvedListId),
					eq(schema.listItems.householdId, resolvedHouseholdId),
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
 * @param householdId - Household id.
 * @param listItemId - List item id.
 * @param input - Validated update payload.
 * @param userId - Audit user id.
 * @returns Updated list item fields.
 */
export async function updateListItem(
	householdId: string,
	listItemId: string,
	input: z.infer<typeof updateListItemBodySchema>,
	userId: number
) {
	const existingListItem = await findListItemOrThrow(listItemId, householdId)
	const audit = createAudit(userId)
	const nextListId = input.listId ?? existingListItem.listId
	const isMovingList = nextListId !== existingListItem.listId

	if (isMovingList) {
		await findListOrThrow(nextListId, householdId)
	}

	const item =
		input.name === undefined
			? assertRow(
					(
						await db
							.select()
							.from(schema.items)
							.where(
								and(
									eq(schema.items.id, existingListItem.itemId),
									eq(schema.items.householdId, householdId)
								)
							)
							.limit(1)
					)[0]
				)
			: await findOrCreateItem({ householdId, name: input.name, auditUserId: userId })

	const [row] = await db
		.update(schema.listItems)
		.set({
			...(input.name === undefined ? {} : { itemId: item.id }),
			...(isMovingList
				? {
						listId: nextListId,
						position: await getNextListItemPosition(nextListId, householdId)
					}
				: {}),
			...(input.amount === undefined ? {} : { amount: input.amount }),
			...(input.unit === undefined ? {} : { unit: input.unit }),
			...(input.note === undefined ? {} : { note: input.note }),
			updatedAt: audit.now,
			updatedByUserId: audit.userId
		})
		.where(and(eq(schema.listItems.id, listItemId), eq(schema.listItems.householdId, householdId)))
		.returning()

	return {
		listItem: serializeListItem(assertRow(row), item)
	}
}

/**
 * Marks a visible list item checked.
 *
 * @param householdId - Household id.
 * @param listItemId - List item id.
 * @param userId - Audit user id.
 * @returns Checked list item summary.
 */
export async function checkListItem(householdId: string, listItemId: string, userId: number) {
	await findListItemOrThrow(listItemId, householdId)
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
		.where(and(eq(schema.listItems.id, listItemId), eq(schema.listItems.householdId, householdId)))
		.returning()

	const listItem = assertRow(row)
	return { listItem: { id: listItem.id, status: listItem.status, checkedAt: listItem.checkedAt } }
}

/**
 * Marks a checked list item unchecked.
 *
 * @param householdId - Household id.
 * @param listItemId - List item id.
 * @param userId - Audit user id.
 * @returns Unchecked list item summary.
 */
export async function uncheckListItem(householdId: string, listItemId: string, userId: number) {
	await findListItemOrThrow(listItemId, householdId)
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
		.where(and(eq(schema.listItems.id, listItemId), eq(schema.listItems.householdId, householdId)))
		.returning()

	const listItem = assertRow(row)
	return { listItem: { id: listItem.id, status: listItem.status } }
}

/**
 * Soft-deletes a list item.
 *
 * @param householdId - Household id.
 * @param listItemId - List item id.
 * @param userId - Audit user id.
 * @returns Deleted list item summary.
 */
export async function deleteListItem(householdId: string, listItemId: string, userId: number) {
	await findListItemOrThrow(listItemId, householdId)
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
		.where(and(eq(schema.listItems.id, listItemId), eq(schema.listItems.householdId, householdId)))
		.returning()

	const listItem = assertRow(row)
	return { listItem: { id: listItem.id, status: listItem.status, deletedAt: listItem.deletedAt } }
}
