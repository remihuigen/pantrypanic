import type { z } from 'zod'
import type {
	createOccurrenceBodySchema,
	createRecipeBodySchema,
	recipeQuerySchema,
	updateOccurrenceBodySchema,
	updateRecipeBodySchema
} from './schemas'

import { createDomainId } from '#server/utils/api-helpers'
import { and, asc, desc, eq, like, sql } from 'drizzle-orm'
import { db, schema } from 'hub:db'

import {
	appendListItemsFromRows,
	assertRow,
	auditFields,
	createAudit,
	findListOrThrow,
	findRecipeItemOrThrow,
	findRecipeOrThrow,
	getNextRecipeItemPosition,
	getRecipeItems,
	serializeRecipeDetail,
	serializeRecipeItem,
	serializeRecipeSummary
} from './base'
import { findOrCreateItem } from './items'

const DEFAULT_HOUSEHOLD_ID = 'household-1'

/**
 * Lists recipes by status and optional query.
 *
 * @param householdId - Household id.
 * @param query - Recipe query.
 * @returns Recipes.
 */
export async function listRecipes(
	householdId: string | z.infer<typeof recipeQuerySchema>,
	query?: z.infer<typeof recipeQuerySchema>
) {
	const resolvedHouseholdId = typeof householdId === 'string' ? householdId : DEFAULT_HOUSEHOLD_ID
	const resolvedQuery = query ?? (householdId as z.infer<typeof recipeQuerySchema>)
	const rows = await db
		.select()
		.from(schema.recipes)
		.where(
			and(
				eq(schema.recipes.householdId, resolvedHouseholdId),
				eq(schema.recipes.status, resolvedQuery.status),
				resolvedQuery.q === undefined
					? undefined
					: like(sql`lower(${schema.recipes.name})`, `%${resolvedQuery.q.toLowerCase()}%`)
			)
		)
		.orderBy(asc(schema.recipes.name), desc(schema.recipes.updatedAt))

	return { recipes: rows.map(serializeRecipeSummary) }
}

/**
 * Creates a recipe and optional ingredients.
 *
 * @param householdId - Household id.
 * @param input - Validated recipe payload.
 * @param userId - Audit user id.
 * @returns Created recipe detail.
 */
export async function createRecipe(
	householdId: string | z.infer<typeof createRecipeBodySchema>,
	input: z.infer<typeof createRecipeBodySchema> | number,
	userId?: number
) {
	const resolvedHouseholdId = typeof householdId === 'string' ? householdId : DEFAULT_HOUSEHOLD_ID
	const resolvedInput =
		typeof householdId === 'string' ? (input as z.infer<typeof createRecipeBodySchema>) : householdId
	const resolvedUserId = typeof householdId === 'string' ? Number(userId) : Number(input)
	const audit = createAudit(resolvedUserId)
	const [recipe] = await db
		.insert(schema.recipes)
		.values({
			id: createDomainId(),
			householdId: resolvedHouseholdId,
			name: resolvedInput.name,
			description: resolvedInput.description ?? null,
			servings: resolvedInput.servings ?? null,
			sourceUrl: resolvedInput.sourceUrl ?? null,
			notes: resolvedInput.notes ?? null,
			status: 'active',
			archivedAt: null,
			deletedAt: null,
			...auditFields(audit)
		})
		.returning()

	const createdRecipe = assertRow(recipe)
	const recipeItems = []

	for (const [index, ingredient] of (resolvedInput.items ?? []).entries()) {
		const item = await findOrCreateItem({
			householdId: resolvedHouseholdId,
			name: ingredient.name,
			auditUserId: resolvedUserId
		})
		const [recipeItem] = await db
			.insert(schema.recipeItems)
			.values({
				id: createDomainId(),
				householdId: resolvedHouseholdId,
				recipeId: createdRecipe.id,
				itemId: item.id,
				amount: ingredient.amount ?? null,
				unit: ingredient.unit ?? null,
				note: ingredient.note ?? null,
				position: ingredient.position ?? index,
				...auditFields(audit)
			})
			.returning()

		recipeItems.push(serializeRecipeItem(assertRow(recipeItem), item))
	}

	return {
		recipe: {
			...serializeRecipeDetail(createdRecipe),
			items: recipeItems.sort((left, right) => left.position - right.position)
		}
	}
}

/**
 * Returns recipe detail with ordered ingredients.
 *
 * @param householdId - Household id.
 * @param recipeId - Recipe id.
 * @returns Recipe detail.
 */
export async function getRecipe(householdId: string, recipeId?: string) {
	const resolvedHouseholdId = recipeId === undefined ? DEFAULT_HOUSEHOLD_ID : householdId
	const resolvedRecipeId = recipeId ?? householdId
	const recipe = await findRecipeOrThrow(resolvedRecipeId, resolvedHouseholdId)
	const items = await getRecipeItems(resolvedRecipeId, resolvedHouseholdId)

	return {
		recipe: {
			...serializeRecipeDetail(recipe),
			items
		}
	}
}

/**
 * Updates recipe metadata.
 *
 * @param householdId - Household id.
 * @param recipeId - Recipe id.
 * @param input - Validated recipe update payload.
 * @param userId - Audit user id.
 * @returns Updated recipe summary.
 */
export async function updateRecipe(
	householdId: string,
	recipeId: string,
	input: z.infer<typeof updateRecipeBodySchema>,
	userId: number
) {
	await findRecipeOrThrow(recipeId, householdId)
	const audit = createAudit(userId)
	const [recipe] = await db
		.update(schema.recipes)
		.set({
			...(input.name === undefined ? {} : { name: input.name }),
			...(input.description === undefined ? {} : { description: input.description }),
			...(input.servings === undefined ? {} : { servings: input.servings }),
			...(input.sourceUrl === undefined ? {} : { sourceUrl: input.sourceUrl }),
			...(input.notes === undefined ? {} : { notes: input.notes }),
			updatedAt: audit.now,
			updatedByUserId: audit.userId
		})
		.where(and(eq(schema.recipes.id, recipeId), eq(schema.recipes.householdId, householdId)))
		.returning()

	const updated = assertRow(recipe)
	return { recipe: { id: updated.id, updatedAt: updated.updatedAt } }
}

/**
 * Archives a recipe.
 *
 * @param householdId - Household id.
 * @param recipeId - Recipe id.
 * @param userId - Audit user id.
 * @returns Archived recipe summary.
 */
export async function archiveRecipe(householdId: string, recipeId: string, userId: number) {
	await findRecipeOrThrow(recipeId, householdId)
	const audit = createAudit(userId)
	const [recipe] = await db
		.update(schema.recipes)
		.set({
			status: 'archived',
			archivedAt: audit.now,
			updatedAt: audit.now,
			updatedByUserId: audit.userId
		})
		.where(and(eq(schema.recipes.id, recipeId), eq(schema.recipes.householdId, householdId)))
		.returning()

	const archived = assertRow(recipe)
	return { recipe: { id: archived.id, status: archived.status, archivedAt: archived.archivedAt } }
}

/**
 * Soft-deletes a recipe.
 *
 * @param householdId - Household id.
 * @param recipeId - Recipe id.
 * @param userId - Audit user id.
 * @returns Deleted recipe summary.
 */
export async function deleteRecipe(householdId: string, recipeId: string, userId: number) {
	await findRecipeOrThrow(recipeId, householdId)
	const audit = createAudit(userId)
	const [recipe] = await db
		.update(schema.recipes)
		.set({
			status: 'deleted',
			deletedAt: audit.now,
			updatedAt: audit.now,
			updatedByUserId: audit.userId
		})
		.where(and(eq(schema.recipes.id, recipeId), eq(schema.recipes.householdId, householdId)))
		.returning()

	const deleted = assertRow(recipe)
	return { recipe: { id: deleted.id, status: deleted.status, deletedAt: deleted.deletedAt } }
}

/**
 * Adds an ingredient to a recipe.
 *
 * @param householdId - Household id.
 * @param recipeId - Recipe id.
 * @param input - Validated ingredient payload.
 * @param userId - Audit user id.
 * @returns Created recipe item.
 */
export async function addRecipeItem(
	householdId: string,
	recipeId: string,
	input: z.infer<typeof createOccurrenceBodySchema>,
	userId: number
) {
	await findRecipeOrThrow(recipeId, householdId)
	const audit = createAudit(userId)
	const item = await findOrCreateItem({ householdId, name: input.name, auditUserId: userId })
	const position = await getNextRecipeItemPosition(recipeId, householdId)
	const [recipeItem] = await db
		.insert(schema.recipeItems)
		.values({
			id: createDomainId(),
			householdId,
			recipeId,
			itemId: item.id,
			amount: input.amount ?? null,
			unit: input.unit ?? null,
			note: input.note ?? null,
			position,
			...auditFields(audit)
		})
		.returning()

	return { recipeItem: serializeRecipeItem(assertRow(recipeItem), item) }
}

/**
 * Reorders recipe items.
 *
 * @param householdId - Household id.
 * @param recipeId - Recipe id.
 * @param orderedIds - Ordered recipe item ids.
 * @param userId - Audit user id.
 * @returns Updated item positions.
 */
export async function reorderRecipeItems(
	householdId: string,
	recipeId: string | string[],
	orderedIds: string[] | number,
	userId?: number
) {
	const isLegacyCall = Array.isArray(recipeId)
	const resolvedHouseholdId = isLegacyCall ? DEFAULT_HOUSEHOLD_ID : householdId
	const resolvedRecipeId = isLegacyCall ? householdId : (recipeId as string)
	const resolvedOrderedIds = isLegacyCall ? recipeId : (orderedIds as string[])
	const resolvedUserId = isLegacyCall ? Number(orderedIds) : Number(userId)
	await findRecipeOrThrow(resolvedRecipeId, resolvedHouseholdId)
	const audit = createAudit(resolvedUserId)
	const updated = []

	for (const [position, id] of resolvedOrderedIds.entries()) {
		const [row] = await db
			.update(schema.recipeItems)
			.set({
				position,
				updatedAt: audit.now,
				updatedByUserId: audit.userId
			})
			.where(
				and(
					eq(schema.recipeItems.id, id),
					eq(schema.recipeItems.householdId, resolvedHouseholdId),
					eq(schema.recipeItems.recipeId, resolvedRecipeId)
				)
			)
			.returning({ id: schema.recipeItems.id, position: schema.recipeItems.position })

		if (row) {
			updated.push(row)
		}
	}

	return { items: updated }
}

/**
 * Copies recipe ingredients into a shopping list.
 *
 * @param householdId - Household id.
 * @param recipeId - Recipe id.
 * @param listId - Target list id.
 * @param userId - Audit user id.
 * @returns Added list items.
 */
export async function addRecipeToList(
	householdId: string,
	recipeId: string,
	listId: string,
	userId: number
) {
	await findRecipeOrThrow(recipeId, householdId)
	await findListOrThrow(listId, householdId)
	const ingredients = await db
		.select({
			recipeItem: schema.recipeItems,
			item: schema.items
		})
		.from(schema.recipeItems)
		.innerJoin(schema.items, eq(schema.items.id, schema.recipeItems.itemId))
		.where(
			and(
				eq(schema.recipeItems.recipeId, recipeId),
				eq(schema.recipeItems.householdId, householdId)
			)
		)
		.orderBy(asc(schema.recipeItems.position), asc(schema.recipeItems.createdAt))

	const addedItems = await appendListItemsFromRows({
		listId,
		householdId,
		userId,
		rows: ingredients.map((row) => ({
			item: row.item,
			amount: row.recipeItem.amount,
			unit: row.recipeItem.unit,
			note: row.recipeItem.note,
			sourceType: 'recipe' as const,
			sourceRecipeId: recipeId,
			sourceMealPlannerDayId: null
		}))
	})

	return { addedItems }
}

/**
 * Updates a recipe item.
 *
 * @param householdId - Household id.
 * @param recipeItemId - Recipe item id.
 * @param input - Validated update payload.
 * @param userId - Audit user id.
 * @returns Updated recipe item summary.
 */
export async function updateRecipeItem(
	householdId: string,
	recipeItemId: string,
	input: z.infer<typeof updateOccurrenceBodySchema>,
	userId: number
) {
	await findRecipeItemOrThrow(recipeItemId, householdId)
	const audit = createAudit(userId)
	const [row] = await db
		.update(schema.recipeItems)
		.set({
			...(input.amount === undefined ? {} : { amount: input.amount }),
			...(input.unit === undefined ? {} : { unit: input.unit }),
			...(input.note === undefined ? {} : { note: input.note }),
			updatedAt: audit.now,
			updatedByUserId: audit.userId
		})
		.where(
			and(
				eq(schema.recipeItems.id, recipeItemId),
				eq(schema.recipeItems.householdId, householdId)
			)
		)
		.returning()

	const recipeItem = assertRow(row)
	return { recipeItem: { id: recipeItem.id, updatedAt: recipeItem.updatedAt } }
}

/**
 * Hard-deletes a recipe item.
 *
 * @param householdId - Household id.
 * @param recipeItemId - Recipe item id.
 * @returns Ok response.
 */
export async function deleteRecipeItem(householdId: string, recipeItemId: string) {
	await findRecipeItemOrThrow(recipeItemId, householdId)
	await db
		.delete(schema.recipeItems)
		.where(
			and(
				eq(schema.recipeItems.id, recipeItemId),
				eq(schema.recipeItems.householdId, householdId)
			)
		)

	return { ok: true }
}
