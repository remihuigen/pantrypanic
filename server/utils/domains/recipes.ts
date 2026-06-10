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

/**
 * Lists recipes by status and optional query.
 *
 * @param query - Recipe query.
 * @returns Recipes.
 */
export async function listRecipes(query: z.infer<typeof recipeQuerySchema>) {
	const rows = await db
		.select()
		.from(schema.recipes)
		.where(
			and(
				eq(schema.recipes.status, query.status),
				query.q === undefined
					? undefined
					: like(sql`lower(${schema.recipes.name})`, `%${query.q.toLowerCase()}%`)
			)
		)
		.orderBy(asc(schema.recipes.name), desc(schema.recipes.updatedAt))

	return { recipes: rows.map(serializeRecipeSummary) }
}

/**
 * Creates a recipe and optional ingredients.
 *
 * @param input - Validated recipe payload.
 * @param userId - Audit user id.
 * @returns Created recipe detail.
 */
export async function createRecipe(input: z.infer<typeof createRecipeBodySchema>, userId: number) {
	const audit = createAudit(userId)
	const [recipe] = await db
		.insert(schema.recipes)
		.values({
			id: createDomainId(),
			name: input.name,
			description: input.description ?? null,
			servings: input.servings ?? null,
			sourceUrl: input.sourceUrl ?? null,
			notes: input.notes ?? null,
			status: 'active',
			archivedAt: null,
			deletedAt: null,
			...auditFields(audit)
		})
		.returning()

	const createdRecipe = assertRow(recipe)
	const recipeItems = []

	for (const [index, ingredient] of (input.items ?? []).entries()) {
		const item = await findOrCreateItem({ name: ingredient.name, auditUserId: userId })
		const [recipeItem] = await db
			.insert(schema.recipeItems)
			.values({
				id: createDomainId(),
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
 * @param recipeId - Recipe id.
 * @returns Recipe detail.
 */
export async function getRecipe(recipeId: string) {
	const recipe = await findRecipeOrThrow(recipeId)
	const items = await getRecipeItems(recipeId)

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
 * @param recipeId - Recipe id.
 * @param input - Validated recipe update payload.
 * @param userId - Audit user id.
 * @returns Updated recipe summary.
 */
export async function updateRecipe(
	recipeId: string,
	input: z.infer<typeof updateRecipeBodySchema>,
	userId: number
) {
	await findRecipeOrThrow(recipeId)
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
		.where(eq(schema.recipes.id, recipeId))
		.returning()

	const updated = assertRow(recipe)
	return { recipe: { id: updated.id, updatedAt: updated.updatedAt } }
}

/**
 * Archives a recipe.
 *
 * @param recipeId - Recipe id.
 * @param userId - Audit user id.
 * @returns Archived recipe summary.
 */
export async function archiveRecipe(recipeId: string, userId: number) {
	await findRecipeOrThrow(recipeId)
	const audit = createAudit(userId)
	const [recipe] = await db
		.update(schema.recipes)
		.set({
			status: 'archived',
			archivedAt: audit.now,
			updatedAt: audit.now,
			updatedByUserId: audit.userId
		})
		.where(eq(schema.recipes.id, recipeId))
		.returning()

	const archived = assertRow(recipe)
	return { recipe: { id: archived.id, status: archived.status, archivedAt: archived.archivedAt } }
}

/**
 * Soft-deletes a recipe.
 *
 * @param recipeId - Recipe id.
 * @param userId - Audit user id.
 * @returns Deleted recipe summary.
 */
export async function deleteRecipe(recipeId: string, userId: number) {
	await findRecipeOrThrow(recipeId)
	const audit = createAudit(userId)
	const [recipe] = await db
		.update(schema.recipes)
		.set({
			status: 'deleted',
			deletedAt: audit.now,
			updatedAt: audit.now,
			updatedByUserId: audit.userId
		})
		.where(eq(schema.recipes.id, recipeId))
		.returning()

	const deleted = assertRow(recipe)
	return { recipe: { id: deleted.id, status: deleted.status, deletedAt: deleted.deletedAt } }
}

/**
 * Adds an ingredient to a recipe.
 *
 * @param recipeId - Recipe id.
 * @param input - Validated ingredient payload.
 * @param userId - Audit user id.
 * @returns Created recipe item.
 */
export async function addRecipeItem(
	recipeId: string,
	input: z.infer<typeof createOccurrenceBodySchema>,
	userId: number
) {
	await findRecipeOrThrow(recipeId)
	const audit = createAudit(userId)
	const item = await findOrCreateItem({ name: input.name, auditUserId: userId })
	const position = await getNextRecipeItemPosition(recipeId)
	const [recipeItem] = await db
		.insert(schema.recipeItems)
		.values({
			id: createDomainId(),
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
 * @param recipeId - Recipe id.
 * @param orderedIds - Ordered recipe item ids.
 * @param userId - Audit user id.
 * @returns Updated item positions.
 */
export async function reorderRecipeItems(recipeId: string, orderedIds: string[], userId: number) {
	await findRecipeOrThrow(recipeId)
	const audit = createAudit(userId)
	const updated = []

	for (const [position, id] of orderedIds.entries()) {
		const [row] = await db
			.update(schema.recipeItems)
			.set({
				position,
				updatedAt: audit.now,
				updatedByUserId: audit.userId
			})
			.where(and(eq(schema.recipeItems.id, id), eq(schema.recipeItems.recipeId, recipeId)))
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
 * @param recipeId - Recipe id.
 * @param listId - Target list id.
 * @param userId - Audit user id.
 * @returns Added list items.
 */
export async function addRecipeToList(recipeId: string, listId: string, userId: number) {
	await findRecipeOrThrow(recipeId)
	await findListOrThrow(listId)
	const ingredients = await db
		.select({
			recipeItem: schema.recipeItems,
			item: schema.items
		})
		.from(schema.recipeItems)
		.innerJoin(schema.items, eq(schema.items.id, schema.recipeItems.itemId))
		.where(eq(schema.recipeItems.recipeId, recipeId))
		.orderBy(asc(schema.recipeItems.position), asc(schema.recipeItems.createdAt))

	const addedItems = await appendListItemsFromRows({
		listId,
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
 * @param recipeItemId - Recipe item id.
 * @param input - Validated update payload.
 * @param userId - Audit user id.
 * @returns Updated recipe item summary.
 */
export async function updateRecipeItem(
	recipeItemId: string,
	input: z.infer<typeof updateOccurrenceBodySchema>,
	userId: number
) {
	await findRecipeItemOrThrow(recipeItemId)
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
		.where(eq(schema.recipeItems.id, recipeItemId))
		.returning()

	const recipeItem = assertRow(row)
	return { recipeItem: { id: recipeItem.id, updatedAt: recipeItem.updatedAt } }
}

/**
 * Hard-deletes a recipe item.
 *
 * @param recipeItemId - Recipe item id.
 * @returns Ok response.
 */
export async function deleteRecipeItem(recipeItemId: string) {
	await findRecipeItemOrThrow(recipeItemId)
	await db.delete(schema.recipeItems).where(eq(schema.recipeItems.id, recipeItemId))

	return { ok: true }
}
