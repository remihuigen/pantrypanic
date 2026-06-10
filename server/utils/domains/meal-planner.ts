import type { z } from 'zod'
import type {
	createOccurrenceBodySchema,
	mealPlannerDayBodySchema,
	updateOccurrenceBodySchema
} from './schemas'

import { optional, throwApiError } from '#server/utils/api-core'
import { createDomainId } from '#server/utils/api-helpers'
import { and, asc, eq, inArray } from 'drizzle-orm'
import { db, schema } from 'hub:db'

import {
	appendListItemsFromRows,
	assertRow,
	auditFields,
	createAudit,
	findListOrThrow,
	findMealPlannerDayItemOrThrow,
	findMealPlannerDayOrThrow,
	findRecipeOrThrow,
	getMealPlannerDays,
	getNextMealPlannerDayItemPosition,
	serializeMealPlannerDayItem
} from './base'
import { findOrCreateItem } from './items'
import { seedInitialDomainData } from './seed'

/**
 * Returns the singleton meal planner.
 *
 * @param userId - Audit user id used to create missing seed rows.
 * @returns Meal planner days.
 */
export async function getMealPlanner(userId: number) {
	await seedInitialDomainData(userId)
	const days = await getMealPlannerDays()
	const recipeIds = days.map((day) => day.recipeId).filter((id): id is string => Boolean(id))
	const dayIds = days.map((day) => day.id)
	const recipes =
		recipeIds.length === 0
			? []
			: await db.select().from(schema.recipes).where(inArray(schema.recipes.id, recipeIds))
	const dayItems = await db
		.select({
			dayItem: schema.mealPlannerDayItems,
			item: schema.items
		})
		.from(schema.mealPlannerDayItems)
		.innerJoin(schema.items, eq(schema.items.id, schema.mealPlannerDayItems.itemId))
		.where(inArray(schema.mealPlannerDayItems.mealPlannerDayId, dayIds))
		.orderBy(
			asc(schema.mealPlannerDayItems.position),
			asc(schema.mealPlannerDayItems.createdAt)
		)

	return {
		days: days.map((day) => {
			const recipe = recipes.find((entry) => entry.id === day.recipeId)
			const items = dayItems
				.filter((row) => row.dayItem.mealPlannerDayId === day.id)
				.map((row) => serializeMealPlannerDayItem(row.dayItem, row.item))

			return {
				id: day.id,
				dayOfWeek: day.dayOfWeek,
				type: day.type,
				recipe: recipe ? { id: recipe.id, name: recipe.name } : undefined,
				placeholderName: optional(day.placeholderName),
				placeholderNotes: optional(day.placeholderNotes),
				items: day.type === 'placeholder' ? items : undefined
			}
		})
	}
}

/**
 * Updates one meal planner day.
 *
 * @param dayOfWeek - Day of week.
 * @param input - Validated day payload.
 * @param userId - Audit user id.
 * @returns Updated day.
 */
export async function updateMealPlannerDay(
	dayOfWeek: number,
	input: z.infer<typeof mealPlannerDayBodySchema>,
	userId: number
) {
	const day = await findMealPlannerDayOrThrow(dayOfWeek)
	const audit = createAudit(userId)

	if (input.type === 'recipe') {
		await findRecipeOrThrow(input.recipeId)
	}

	if (input.type !== 'placeholder') {
		await db
			.delete(schema.mealPlannerDayItems)
			.where(eq(schema.mealPlannerDayItems.mealPlannerDayId, day.id))
	}

	const [updated] = await db
		.update(schema.mealPlannerDays)
		.set({
			type: input.type,
			recipeId: input.type === 'recipe' ? input.recipeId : null,
			placeholderName: input.type === 'placeholder' ? input.placeholderName : null,
			placeholderNotes:
				input.type === 'placeholder' ? (input.placeholderNotes ?? null) : null,
			updatedAt: audit.now,
			updatedByUserId: audit.userId
		})
		.where(eq(schema.mealPlannerDays.id, day.id))
		.returning()

	const nextDay = assertRow(updated)
	return {
		day: {
			id: nextDay.id,
			dayOfWeek: nextDay.dayOfWeek,
			type: nextDay.type,
			recipeId: optional(nextDay.recipeId),
			placeholderName: optional(nextDay.placeholderName)
		}
	}
}

/**
 * Adds an ingredient to a placeholder meal planner day.
 *
 * @param dayOfWeek - Day of week.
 * @param input - Validated ingredient payload.
 * @param userId - Audit user id.
 * @returns Created meal planner day item.
 */
export async function addMealPlannerDayItem(
	dayOfWeek: number,
	input: z.infer<typeof createOccurrenceBodySchema>,
	userId: number
) {
	const day = await findMealPlannerDayOrThrow(dayOfWeek)

	if (day.type !== 'placeholder') {
		throwApiError({
			code: 'CONFLICT',
			statusCode: 409,
			message: 'Deze dag is geen tijdelijke maaltijd.'
		})
	}

	const audit = createAudit(userId)
	const item = await findOrCreateItem({ name: input.name, auditUserId: userId })
	const position = await getNextMealPlannerDayItemPosition(day.id)
	const [dayItem] = await db
		.insert(schema.mealPlannerDayItems)
		.values({
			id: createDomainId(),
			mealPlannerDayId: day.id,
			itemId: item.id,
			label: input.label ?? null,
			amount: input.amount ?? null,
			unit: input.unit ?? null,
			note: input.note ?? null,
			position,
			...auditFields(audit)
		})
		.returning()

	return { mealPlannerDayItem: serializeMealPlannerDayItem(assertRow(dayItem), item) }
}

/**
 * Reorders placeholder meal planner day items.
 *
 * @param dayOfWeek - Day of week.
 * @param orderedIds - Ordered day item ids.
 * @param userId - Audit user id.
 * @returns Updated item positions.
 */
export async function reorderMealPlannerDayItems(
	dayOfWeek: number,
	orderedIds: string[],
	userId: number
) {
	const day = await findMealPlannerDayOrThrow(dayOfWeek)
	const audit = createAudit(userId)
	const updated = []

	for (const [position, id] of orderedIds.entries()) {
		const [row] = await db
			.update(schema.mealPlannerDayItems)
			.set({
				position,
				updatedAt: audit.now,
				updatedByUserId: audit.userId
			})
			.where(
				and(
					eq(schema.mealPlannerDayItems.id, id),
					eq(schema.mealPlannerDayItems.mealPlannerDayId, day.id)
				)
			)
			.returning({
				id: schema.mealPlannerDayItems.id,
				position: schema.mealPlannerDayItems.position
			})

		if (row) {
			updated.push(row)
		}
	}

	return { items: updated }
}

/**
 * Adds all planned meal ingredients to a shopping list.
 *
 * @param listId - Target list id.
 * @param userId - Audit user id.
 * @returns Added list items.
 */
export async function addMealPlannerToList(listId: string, userId: number) {
	await findListOrThrow(listId)
	const days = await getMealPlannerDays()
	const addedItems = []

	for (const day of days) {
		if (day.type === 'recipe' && day.recipeId) {
			const ingredients = await db
				.select({
					recipeItem: schema.recipeItems,
					item: schema.items
				})
				.from(schema.recipeItems)
				.innerJoin(schema.items, eq(schema.items.id, schema.recipeItems.itemId))
				.where(eq(schema.recipeItems.recipeId, day.recipeId))
				.orderBy(asc(schema.recipeItems.position), asc(schema.recipeItems.createdAt))

			addedItems.push(
				...(await appendListItemsFromRows({
					listId,
					userId,
					rows: ingredients.map((row) => ({
						item: row.item,
						label: row.recipeItem.label,
						amount: row.recipeItem.amount,
						unit: row.recipeItem.unit,
						note: row.recipeItem.note,
						sourceType: 'meal_planner_recipe' as const,
						sourceRecipeId: day.recipeId,
						sourceMealPlannerDayId: day.id
					}))
				}))
			)
		}

		if (day.type === 'placeholder') {
			const ingredients = await db
				.select({
					dayItem: schema.mealPlannerDayItems,
					item: schema.items
				})
				.from(schema.mealPlannerDayItems)
				.innerJoin(schema.items, eq(schema.items.id, schema.mealPlannerDayItems.itemId))
				.where(eq(schema.mealPlannerDayItems.mealPlannerDayId, day.id))
				.orderBy(
					asc(schema.mealPlannerDayItems.position),
					asc(schema.mealPlannerDayItems.createdAt)
				)

			addedItems.push(
				...(await appendListItemsFromRows({
					listId,
					userId,
					rows: ingredients.map((row) => ({
						item: row.item,
						label: row.dayItem.label,
						amount: row.dayItem.amount,
						unit: row.dayItem.unit,
						note: row.dayItem.note,
						sourceType: 'meal_planner_placeholder' as const,
						sourceRecipeId: null,
						sourceMealPlannerDayId: day.id
					}))
				}))
			)
		}
	}

	return { addedItems }
}

/**
 * Clears the meal planner.
 *
 * @param userId - Audit user id.
 * @returns Number of cleared days.
 */
export async function clearMealPlanner(userId: number) {
	const audit = createAudit(userId)
	await db.delete(schema.mealPlannerDayItems)
	const days = await db
		.update(schema.mealPlannerDays)
		.set({
			type: 'empty',
			recipeId: null,
			placeholderName: null,
			placeholderNotes: null,
			updatedAt: audit.now,
			updatedByUserId: audit.userId
		})
		.returning({ id: schema.mealPlannerDays.id })

	return { clearedDays: days.length }
}

/**
 * Updates a placeholder meal planner day item.
 *
 * @param mealPlannerDayItemId - Day item id.
 * @param input - Validated update payload.
 * @param userId - Audit user id.
 * @returns Updated day item summary.
 */
export async function updateMealPlannerDayItem(
	mealPlannerDayItemId: string,
	input: z.infer<typeof updateOccurrenceBodySchema>,
	userId: number
) {
	await findMealPlannerDayItemOrThrow(mealPlannerDayItemId)
	const audit = createAudit(userId)
	const [row] = await db
		.update(schema.mealPlannerDayItems)
		.set({
			...(input.label === undefined ? {} : { label: input.label }),
			...(input.amount === undefined ? {} : { amount: input.amount }),
			...(input.unit === undefined ? {} : { unit: input.unit }),
			...(input.note === undefined ? {} : { note: input.note }),
			updatedAt: audit.now,
			updatedByUserId: audit.userId
		})
		.where(eq(schema.mealPlannerDayItems.id, mealPlannerDayItemId))
		.returning()

	const dayItem = assertRow(row)
	return { mealPlannerDayItem: { id: dayItem.id, updatedAt: dayItem.updatedAt } }
}

/**
 * Hard-deletes a meal planner day item.
 *
 * @param mealPlannerDayItemId - Day item id.
 * @returns Ok response.
 */
export async function deleteMealPlannerDayItem(mealPlannerDayItemId: string) {
	await findMealPlannerDayItemOrThrow(mealPlannerDayItemId)
	await db
		.delete(schema.mealPlannerDayItems)
		.where(eq(schema.mealPlannerDayItems.id, mealPlannerDayItemId))

	return { ok: true }
}
