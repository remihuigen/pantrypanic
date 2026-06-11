import { optional, throwApiError } from '#server/utils/api-core'
import { createDomainId } from '#server/utils/api-helpers'
import { and, asc, desc, eq, inArray, ne } from 'drizzle-orm'
import { db, schema } from 'hub:db'

import { mealPlannerDayNumbers } from './seed'

export type Audit = {
	userId: number
	now: number
}

export type ListRow = typeof schema.lists.$inferSelect
export type ItemRow = typeof schema.items.$inferSelect
export type RecipeRow = typeof schema.recipes.$inferSelect
export type ListItemRow = typeof schema.listItems.$inferSelect
export type RecipeItemRow = typeof schema.recipeItems.$inferSelect
export type MealPlannerDayRow = typeof schema.mealPlannerDays.$inferSelect
export type MealPlannerDayItemRow = typeof schema.mealPlannerDayItems.$inferSelect

/**
 * Converts a list row to API response shape.
 *
 * @param list - Persisted list row.
 * @returns Public list payload.
 */
export function serializeList(list: ListRow) {
	return {
		id: list.id,
		name: list.name,
		icon: optional(list.icon),
		status: list.status,
		position: list.position,
		createdAt: list.createdAt,
		updatedAt: list.updatedAt
	}
}

/**
 * Converts an item row to API response shape.
 *
 * @param item - Persisted item row.
 * @returns Public item payload.
 */
export function serializeItem(item: ItemRow) {
	return {
		id: item.id,
		name: item.name,
		defaultUnit: optional(item.defaultUnit),
		category: optional(item.category)
	}
}

/**
 * Combines list-item and item rows into API response shape.
 *
 * @param listItem - Persisted list-item row.
 * @param item - Persisted canonical item row.
 * @returns Public list-item payload.
 */
export function serializeListItem(listItem: ListItemRow, item: ItemRow) {
	return {
		id: listItem.id,
		listId: listItem.listId,
		itemId: listItem.itemId,
		name: item.name,
		amount: optional(listItem.amount),
		unit: optional(listItem.unit),
		note: optional(listItem.note),
		status: listItem.status,
		position: listItem.position,
		sourceType: listItem.sourceType
	}
}

/**
 * Converts a recipe row into list/summary payload.
 *
 * @param recipe - Persisted recipe row.
 * @returns Recipe summary payload.
 */
export function serializeRecipeSummary(recipe: RecipeRow) {
	return {
		id: recipe.id,
		name: recipe.name,
		description: optional(recipe.description),
		servings: optional(recipe.servings),
		status: recipe.status,
		updatedAt: recipe.updatedAt
	}
}

/**
 * Converts a recipe row into detail payload.
 *
 * @param recipe - Persisted recipe row.
 * @returns Recipe detail payload.
 */
export function serializeRecipeDetail(recipe: RecipeRow) {
	return {
		id: recipe.id,
		name: recipe.name,
		description: optional(recipe.description),
		servings: optional(recipe.servings),
		sourceUrl: optional(recipe.sourceUrl),
		notes: optional(recipe.notes),
		status: recipe.status
	}
}

/**
 * Combines recipe-item and item rows into API response shape.
 *
 * @param recipeItem - Persisted recipe-item row.
 * @param item - Persisted canonical item row.
 * @returns Public recipe-item payload.
 */
export function serializeRecipeItem(recipeItem: RecipeItemRow, item: ItemRow) {
	return {
		id: recipeItem.id,
		recipeId: recipeItem.recipeId,
		itemId: recipeItem.itemId,
		name: item.name,
		amount: optional(recipeItem.amount),
		unit: optional(recipeItem.unit),
		note: optional(recipeItem.note),
		position: recipeItem.position
	}
}

/**
 * Combines meal-planner-day-item and item rows into API response shape.
 *
 * @param dayItem - Persisted meal-planner-day-item row.
 * @param item - Persisted canonical item row.
 * @returns Public meal-planner-day-item payload.
 */
export function serializeMealPlannerDayItem(dayItem: MealPlannerDayItemRow, item: ItemRow) {
	return {
		id: dayItem.id,
		itemId: dayItem.itemId,
		name: item.name,
		amount: optional(dayItem.amount),
		unit: optional(dayItem.unit),
		note: optional(dayItem.note),
		position: dayItem.position
	}
}

/**
 * Creates audit metadata for mutations.
 *
 * @param userId - Acting user id.
 * @returns Audit metadata with timestamp.
 */
export function createAudit(userId: number): Audit {
	return {
		userId,
		now: Date.now()
	}
}

/**
 * Builds common created/updated columns from audit metadata.
 *
 * @param audit - Audit metadata.
 * @returns Shared mutation columns.
 */
export function auditFields(audit: Audit) {
	return {
		createdAt: audit.now,
		updatedAt: audit.now,
		createdByUserId: audit.userId,
		updatedByUserId: audit.userId
	}
}

/**
 * Loads a non-deleted list or throws 404-style API error.
 *
 * @param listId - List id.
 * @returns Existing list row.
 */
export async function findListOrThrow(listId: string, householdId: string) {
	const [list] = await db
		.select()
		.from(schema.lists)
		.where(
			and(
				eq(schema.lists.id, listId),
				eq(schema.lists.householdId, householdId),
				ne(schema.lists.status, 'deleted')
			)
		)
		.limit(1)

	return assertFound(list)
}

/**
 * Loads a non-deleted list item or throws 404-style API error.
 *
 * @param listItemId - List item id.
 * @returns Existing list-item row.
 */
export async function findListItemOrThrow(listItemId: string, householdId: string) {
	const [listItem] = await db
		.select()
		.from(schema.listItems)
		.where(
			and(
				eq(schema.listItems.id, listItemId),
				eq(schema.listItems.householdId, householdId),
				ne(schema.listItems.status, 'deleted')
			)
		)
		.limit(1)

	return assertFound(listItem)
}

/**
 * Loads a non-deleted recipe or throws 404-style API error.
 *
 * @param recipeId - Recipe id.
 * @returns Existing recipe row.
 */
export async function findRecipeOrThrow(recipeId: string, householdId: string) {
	const [recipe] = await db
		.select()
		.from(schema.recipes)
		.where(
			and(
				eq(schema.recipes.id, recipeId),
				eq(schema.recipes.householdId, householdId),
				ne(schema.recipes.status, 'deleted')
			)
		)
		.limit(1)

	return assertFound(recipe)
}

/**
 * Loads a recipe item or throws 404-style API error.
 *
 * @param recipeItemId - Recipe item id.
 * @returns Existing recipe-item row.
 */
export async function findRecipeItemOrThrow(recipeItemId: string, householdId: string) {
	const [recipeItem] = await db
		.select()
		.from(schema.recipeItems)
		.where(
			and(
				eq(schema.recipeItems.id, recipeItemId),
				eq(schema.recipeItems.householdId, householdId)
			)
		)
		.limit(1)

	return assertFound(recipeItem)
}

/**
 * Loads a meal-planner day by weekday number or throws 404-style API error.
 *
 * @param dayOfWeek - Weekday number.
 * @returns Existing meal-planner-day row.
 */
export async function findMealPlannerDayOrThrow(dayOfWeek: number, householdId: string) {
	const [day] = await db
		.select()
		.from(schema.mealPlannerDays)
		.where(
			and(
				eq(schema.mealPlannerDays.dayOfWeek, dayOfWeek),
				eq(schema.mealPlannerDays.householdId, householdId)
			)
		)
		.limit(1)

	return assertFound(day)
}

/**
 * Loads a meal-planner-day item or throws 404-style API error.
 *
 * @param mealPlannerDayItemId - Meal-planner-day item id.
 * @returns Existing meal-planner-day-item row.
 */
export async function findMealPlannerDayItemOrThrow(
	mealPlannerDayItemId: string,
	householdId: string
) {
	const [dayItem] = await db
		.select()
		.from(schema.mealPlannerDayItems)
		.where(
			and(
				eq(schema.mealPlannerDayItems.id, mealPlannerDayItemId),
				eq(schema.mealPlannerDayItems.householdId, householdId)
			)
		)
		.limit(1)

	return assertFound(dayItem)
}

/**
 * Calculates the next position for active lists.
 *
 * @returns Next zero-based list position.
 */
export async function getNextListPosition(householdId: string) {
	const [last] = await db
		.select({ position: schema.lists.position })
		.from(schema.lists)
		.where(and(eq(schema.lists.householdId, householdId), eq(schema.lists.status, 'active')))
		.orderBy(desc(schema.lists.position))
		.limit(1)

	return (last?.position ?? -1) + 1
}

/**
 * Calculates the next position for visible list items.
 *
 * @param listId - Parent list id.
 * @returns Next zero-based list-item position.
 */
export async function getNextListItemPosition(listId: string, householdId: string) {
	const [last] = await db
		.select({ position: schema.listItems.position })
		.from(schema.listItems)
		.where(
			and(
				eq(schema.listItems.listId, listId),
				eq(schema.listItems.householdId, householdId),
				inArray(schema.listItems.status, ['unchecked', 'checked'])
			)
		)
		.orderBy(desc(schema.listItems.position))
		.limit(1)

	return (last?.position ?? -1) + 1
}

/**
 * Calculates the next position for recipe items.
 *
 * @param recipeId - Parent recipe id.
 * @returns Next zero-based recipe-item position.
 */
export async function getNextRecipeItemPosition(recipeId: string, householdId: string) {
	const [last] = await db
		.select({ position: schema.recipeItems.position })
		.from(schema.recipeItems)
		.where(
			and(
				eq(schema.recipeItems.recipeId, recipeId),
				eq(schema.recipeItems.householdId, householdId)
			)
		)
		.orderBy(desc(schema.recipeItems.position))
		.limit(1)

	return (last?.position ?? -1) + 1
}

/**
 * Calculates the next position for meal-planner-day items.
 *
 * @param mealPlannerDayId - Parent meal-planner-day id.
 * @returns Next zero-based day-item position.
 */
export async function getNextMealPlannerDayItemPosition(
	mealPlannerDayId: string,
	householdId: string
) {
	const [last] = await db
		.select({ position: schema.mealPlannerDayItems.position })
		.from(schema.mealPlannerDayItems)
		.where(
			and(
				eq(schema.mealPlannerDayItems.mealPlannerDayId, mealPlannerDayId),
				eq(schema.mealPlannerDayItems.householdId, householdId)
			)
		)
		.orderBy(desc(schema.mealPlannerDayItems.position))
		.limit(1)

	return (last?.position ?? -1) + 1
}

/**
 * Returns ordered recipe items with joined canonical item rows.
 *
 * @param recipeId - Recipe id.
 * @returns Serialized recipe items.
 */
export async function getRecipeItems(recipeId: string, householdId: string) {
	const rows = await db
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

	return rows.map((row) => serializeRecipeItem(row.recipeItem, row.item))
}

/**
 * Returns meal-planner days ordered by configured weekday sequence.
 *
 * @returns Existing meal-planner-day rows.
 */
export async function getMealPlannerDays(householdId: string) {
	const rows = await db
		.select()
		.from(schema.mealPlannerDays)
		.where(eq(schema.mealPlannerDays.householdId, householdId))
		.orderBy(asc(schema.mealPlannerDays.dayOfWeek))

	return mealPlannerDayNumbers
		.map((dayOfWeek) => rows.find((row) => row.dayOfWeek === dayOfWeek))
		.filter((day): day is MealPlannerDayRow => Boolean(day))
}

/**
 * Appends one or more rows to a shopping list using source metadata.
 *
 * @param options - Parent list, actor, and row payloads to append.
 * @returns Added list-item summaries.
 */
export async function appendListItemsFromRows(options: {
	listId: string
	householdId: string
	userId: number
	rows: Array<{
		item: ItemRow
		amount: number | null
		unit: string | null
		note: string | null
		sourceType: schema.ListItemSourceType
		sourceRecipeId: string | null
		sourceMealPlannerDayId: string | null
	}>
}) {
	const audit = createAudit(options.userId)
	let position = await getNextListItemPosition(options.listId, options.householdId)
	const added = []

	for (const row of options.rows) {
		const [listItem] = await db
			.insert(schema.listItems)
			.values({
				id: createDomainId(),
				householdId: options.householdId,
				listId: options.listId,
				itemId: row.item.id,
				status: 'unchecked',
				position,
				amount: row.amount,
				unit: row.unit,
				note: row.note,
				sourceType: row.sourceType,
				sourceRecipeId: row.sourceRecipeId,
				sourceMealPlannerDayId: row.sourceMealPlannerDayId,
				checkedAt: null,
				checkedByUserId: null,
				archivedAt: null,
				archivedByUserId: null,
				deletedAt: null,
				deletedByUserId: null,
				...auditFields(audit)
			})
			.returning()

		position += 1
		const created = assertRow(listItem)
		added.push({
			id: created.id,
			listId: created.listId,
			itemId: created.itemId,
			name: row.item.name,
			sourceType: created.sourceType
		})
	}

	return added
}

/**
 * Asserts a row exists or throws a not-found API error.
 *
 * @template T - Row type.
 * @param row - Row candidate.
 * @returns Existing row.
 */
export function assertFound<T>(row: T | undefined): T {
	if (!row) {
		throwNotFound()
	}

	return row
}

/**
 * Asserts a row exists or throws an internal API error.
 *
 * @template T - Row type.
 * @param row - Row candidate.
 * @returns Existing row.
 */
export function assertRow<T>(row: T | undefined): T {
	if (!row) {
		throwApiError({
			code: 'INTERNAL_ERROR',
			statusCode: 500,
			message: 'Er is iets misgegaan.'
		})
	}

	return row
}

/**
 * Throws the shared domain not-found API error.
 *
 * @throws API error with 404 status.
 */
export function throwNotFound(): never {
	throwApiError({
		code: 'NOT_FOUND',
		statusCode: 404,
		message: 'Niet gevonden.'
	})
}
