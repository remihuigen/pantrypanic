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

const DEFAULT_HOUSEHOLD_ID = 'household-1'

/**
 * Returns the singleton meal planner.
 *
 * @param householdId - Household id.
 * @param userId - Audit user id used to create missing seed rows.
 * @returns Meal planner days.
 */
export async function getMealPlanner(householdId: string, userId: number) {
	await seedInitialDomainData(userId, householdId)
	const days = await getMealPlannerDays(householdId)
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
		.where(
			and(
				eq(schema.mealPlannerDayItems.householdId, householdId),
				inArray(schema.mealPlannerDayItems.mealPlannerDayId, dayIds)
			)
		)
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
 * @param householdId - Household id.
 * @param dayOfWeek - Day of week.
 * @param input - Validated day payload.
 * @param userId - Audit user id.
 * @returns Updated day.
 */
export async function updateMealPlannerDay(
	householdId: string | number,
	dayOfWeek: number | z.infer<typeof mealPlannerDayBodySchema>,
	input: z.infer<typeof mealPlannerDayBodySchema> | number,
	userId?: number
) {
	const isLegacyCall = typeof householdId === 'number'
	const resolvedHouseholdId = isLegacyCall ? DEFAULT_HOUSEHOLD_ID : householdId
	const resolvedDayOfWeek = isLegacyCall ? householdId : (dayOfWeek as number)
	const resolvedInput = isLegacyCall
		? (dayOfWeek as z.infer<typeof mealPlannerDayBodySchema>)
		: (input as z.infer<typeof mealPlannerDayBodySchema>)
	const resolvedUserId = isLegacyCall ? Number(input) : Number(userId)
	const day = await findMealPlannerDayOrThrow(resolvedDayOfWeek, resolvedHouseholdId)
	const audit = createAudit(resolvedUserId)

	if (resolvedInput.type === 'recipe') {
		await findRecipeOrThrow(resolvedInput.recipeId, resolvedHouseholdId)
	}

	if (resolvedInput.type !== 'placeholder') {
		await db
			.delete(schema.mealPlannerDayItems)
			.where(
				and(
					eq(schema.mealPlannerDayItems.mealPlannerDayId, day.id),
					eq(schema.mealPlannerDayItems.householdId, resolvedHouseholdId)
				)
			)
	}

	const [updated] = await db
		.update(schema.mealPlannerDays)
		.set({
			type: resolvedInput.type,
			recipeId: resolvedInput.type === 'recipe' ? resolvedInput.recipeId : null,
			placeholderName:
				resolvedInput.type === 'placeholder' ? resolvedInput.placeholderName : null,
			placeholderNotes:
				resolvedInput.type === 'placeholder'
					? (resolvedInput.placeholderNotes ?? null)
					: null,
			updatedAt: audit.now,
			updatedByUserId: audit.userId
		})
		.where(
			and(
				eq(schema.mealPlannerDays.id, day.id),
				eq(schema.mealPlannerDays.householdId, resolvedHouseholdId)
			)
		)
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
 * @param householdId - Household id.
 * @param dayOfWeek - Day of week.
 * @param input - Validated ingredient payload.
 * @param userId - Audit user id.
 * @returns Created meal planner day item.
 */
export async function addMealPlannerDayItem(
	householdId: string | number,
	dayOfWeek: number | z.infer<typeof createOccurrenceBodySchema>,
	input: z.infer<typeof createOccurrenceBodySchema> | number,
	userId?: number
) {
	const isLegacyCall = typeof householdId === 'number'
	const resolvedHouseholdId = isLegacyCall ? DEFAULT_HOUSEHOLD_ID : householdId
	const resolvedDayOfWeek = isLegacyCall ? householdId : (dayOfWeek as number)
	const resolvedInput = isLegacyCall
		? (dayOfWeek as z.infer<typeof createOccurrenceBodySchema>)
		: (input as z.infer<typeof createOccurrenceBodySchema>)
	const resolvedUserId = isLegacyCall ? Number(input) : Number(userId)
	const day = await findMealPlannerDayOrThrow(resolvedDayOfWeek, resolvedHouseholdId)

	if (day.type !== 'placeholder') {
		throwApiError({
			code: 'CONFLICT',
			statusCode: 409,
			message: 'Deze dag is geen tijdelijke maaltijd.'
		})
	}

	const audit = createAudit(resolvedUserId)
	const item = await findOrCreateItem({
		householdId: resolvedHouseholdId,
		name: resolvedInput.name,
		auditUserId: resolvedUserId
	})
	const position = await getNextMealPlannerDayItemPosition(day.id, resolvedHouseholdId)
	const [dayItem] = await db
		.insert(schema.mealPlannerDayItems)
		.values({
			id: createDomainId(),
			householdId: resolvedHouseholdId,
			mealPlannerDayId: day.id,
			itemId: item.id,
			amount: resolvedInput.amount ?? null,
			unit: resolvedInput.unit ?? null,
			note: resolvedInput.note ?? null,
			position,
			...auditFields(audit)
		})
		.returning()

	return { mealPlannerDayItem: serializeMealPlannerDayItem(assertRow(dayItem), item) }
}

/**
 * Reorders placeholder meal planner day items.
 *
 * @param householdId - Household id.
 * @param dayOfWeek - Day of week.
 * @param orderedIds - Ordered day item ids.
 * @param userId - Audit user id.
 * @returns Updated item positions.
 */
export async function reorderMealPlannerDayItems(
	householdId: string | number,
	dayOfWeek: number | string[],
	orderedIds: string[] | number,
	userId?: number
) {
	const isLegacyCall = typeof householdId === 'number'
	const resolvedHouseholdId = isLegacyCall ? DEFAULT_HOUSEHOLD_ID : householdId
	const resolvedDayOfWeek = isLegacyCall ? householdId : (dayOfWeek as number)
	const resolvedOrderedIds = isLegacyCall ? (dayOfWeek as string[]) : (orderedIds as string[])
	const resolvedUserId = isLegacyCall ? Number(orderedIds) : Number(userId)
	const day = await findMealPlannerDayOrThrow(resolvedDayOfWeek, resolvedHouseholdId)
	const audit = createAudit(resolvedUserId)
	const updated = []

	for (const [position, id] of resolvedOrderedIds.entries()) {
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
					eq(schema.mealPlannerDayItems.householdId, resolvedHouseholdId),
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
 * @param householdId - Household id.
 * @param listId - Target list id.
 * @param userId - Audit user id.
 * @returns Added list items.
 */
export async function addMealPlannerToList(householdId: string, listId: string, userId: number) {
	await findListOrThrow(listId, householdId)
	const days = await getMealPlannerDays(householdId)
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
				.where(
					and(
						eq(schema.recipeItems.recipeId, day.recipeId),
						eq(schema.recipeItems.householdId, householdId)
					)
				)
				.orderBy(asc(schema.recipeItems.position), asc(schema.recipeItems.createdAt))

			addedItems.push(
				...(await appendListItemsFromRows({
					listId,
					householdId,
					userId,
					rows: ingredients.map((row) => ({
						item: row.item,
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
				.where(
					and(
						eq(schema.mealPlannerDayItems.mealPlannerDayId, day.id),
						eq(schema.mealPlannerDayItems.householdId, householdId)
					)
				)
				.orderBy(
					asc(schema.mealPlannerDayItems.position),
					asc(schema.mealPlannerDayItems.createdAt)
				)

			addedItems.push(
				...(await appendListItemsFromRows({
					listId,
					householdId,
					userId,
					rows: ingredients.map((row) => ({
						item: row.item,
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
 * @param householdId - Household id.
 * @param userId - Audit user id.
 * @returns Number of cleared days.
 */
export async function clearMealPlanner(householdId: string, userId: number) {
	const audit = createAudit(userId)
	await db
		.delete(schema.mealPlannerDayItems)
		.where(eq(schema.mealPlannerDayItems.householdId, householdId))
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
		.where(eq(schema.mealPlannerDays.householdId, householdId))
		.returning({ id: schema.mealPlannerDays.id })

	return { clearedDays: days.length }
}

/**
 * Updates a placeholder meal planner day item.
 *
 * @param householdId - Household id.
 * @param mealPlannerDayItemId - Day item id.
 * @param input - Validated update payload.
 * @param userId - Audit user id.
 * @returns Updated day item summary.
 */
export async function updateMealPlannerDayItem(
	householdId: string,
	mealPlannerDayItemId: string,
	input: z.infer<typeof updateOccurrenceBodySchema>,
	userId: number
) {
	await findMealPlannerDayItemOrThrow(mealPlannerDayItemId, householdId)
	const audit = createAudit(userId)
	const [row] = await db
		.update(schema.mealPlannerDayItems)
		.set({
			...(input.amount === undefined ? {} : { amount: input.amount }),
			...(input.unit === undefined ? {} : { unit: input.unit }),
			...(input.note === undefined ? {} : { note: input.note }),
			updatedAt: audit.now,
			updatedByUserId: audit.userId
		})
		.where(
			and(
				eq(schema.mealPlannerDayItems.id, mealPlannerDayItemId),
				eq(schema.mealPlannerDayItems.householdId, householdId)
			)
		)
		.returning()

	const dayItem = assertRow(row)
	return { mealPlannerDayItem: { id: dayItem.id, updatedAt: dayItem.updatedAt } }
}

/**
 * Hard-deletes a meal planner day item.
 *
 * @param householdId - Household id.
 * @param mealPlannerDayItemId - Day item id.
 * @returns Ok response.
 */
export async function deleteMealPlannerDayItem(householdId: string, mealPlannerDayItemId: string) {
	await findMealPlannerDayItemOrThrow(mealPlannerDayItemId, householdId)
	await db
		.delete(schema.mealPlannerDayItems)
		.where(
			and(
				eq(schema.mealPlannerDayItems.id, mealPlannerDayItemId),
				eq(schema.mealPlannerDayItems.householdId, householdId)
			)
		)

	return { ok: true }
}
