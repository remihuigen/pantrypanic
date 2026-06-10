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

export function serializeList(list: ListRow) {
	return {
		id: list.id,
		name: list.name,
		status: list.status,
		position: list.position,
		createdAt: list.createdAt,
		updatedAt: list.updatedAt
	}
}

export function serializeItem(item: ItemRow) {
	return {
		id: item.id,
		name: item.name,
		defaultUnit: optional(item.defaultUnit),
		category: optional(item.category)
	}
}

export function serializeListItem(listItem: ListItemRow, item: ItemRow) {
	return {
		id: listItem.id,
		listId: listItem.listId,
		itemId: listItem.itemId,
		name: item.name,
		label: optional(listItem.label),
		amount: optional(listItem.amount),
		unit: optional(listItem.unit),
		note: optional(listItem.note),
		status: listItem.status,
		position: listItem.position,
		sourceType: listItem.sourceType
	}
}

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

export function serializeRecipeItem(recipeItem: RecipeItemRow, item: ItemRow) {
	return {
		id: recipeItem.id,
		recipeId: recipeItem.recipeId,
		itemId: recipeItem.itemId,
		name: item.name,
		label: optional(recipeItem.label),
		amount: optional(recipeItem.amount),
		unit: optional(recipeItem.unit),
		note: optional(recipeItem.note),
		position: recipeItem.position
	}
}

export function serializeMealPlannerDayItem(dayItem: MealPlannerDayItemRow, item: ItemRow) {
	return {
		id: dayItem.id,
		itemId: dayItem.itemId,
		name: item.name,
		label: optional(dayItem.label),
		amount: optional(dayItem.amount),
		unit: optional(dayItem.unit),
		note: optional(dayItem.note),
		position: dayItem.position
	}
}

export function createAudit(userId: number): Audit {
	return {
		userId,
		now: Date.now()
	}
}

export function auditFields(audit: Audit) {
	return {
		createdAt: audit.now,
		updatedAt: audit.now,
		createdByUserId: audit.userId,
		updatedByUserId: audit.userId
	}
}

export async function findListOrThrow(listId: string) {
	const [list] = await db
		.select()
		.from(schema.lists)
		.where(and(eq(schema.lists.id, listId), ne(schema.lists.status, 'deleted')))
		.limit(1)

	return assertFound(list)
}

export async function findListItemOrThrow(listItemId: string) {
	const [listItem] = await db
		.select()
		.from(schema.listItems)
		.where(and(eq(schema.listItems.id, listItemId), ne(schema.listItems.status, 'deleted')))
		.limit(1)

	return assertFound(listItem)
}

export async function findRecipeOrThrow(recipeId: string) {
	const [recipe] = await db
		.select()
		.from(schema.recipes)
		.where(and(eq(schema.recipes.id, recipeId), ne(schema.recipes.status, 'deleted')))
		.limit(1)

	return assertFound(recipe)
}

export async function findRecipeItemOrThrow(recipeItemId: string) {
	const [recipeItem] = await db
		.select()
		.from(schema.recipeItems)
		.where(eq(schema.recipeItems.id, recipeItemId))
		.limit(1)

	return assertFound(recipeItem)
}

export async function findMealPlannerDayOrThrow(dayOfWeek: number) {
	const [day] = await db
		.select()
		.from(schema.mealPlannerDays)
		.where(eq(schema.mealPlannerDays.dayOfWeek, dayOfWeek))
		.limit(1)

	return assertFound(day)
}

export async function findMealPlannerDayItemOrThrow(mealPlannerDayItemId: string) {
	const [dayItem] = await db
		.select()
		.from(schema.mealPlannerDayItems)
		.where(eq(schema.mealPlannerDayItems.id, mealPlannerDayItemId))
		.limit(1)

	return assertFound(dayItem)
}

export async function getNextListPosition() {
	const [last] = await db
		.select({ position: schema.lists.position })
		.from(schema.lists)
		.where(eq(schema.lists.status, 'active'))
		.orderBy(desc(schema.lists.position))
		.limit(1)

	return (last?.position ?? -1) + 1
}

export async function getNextListItemPosition(listId: string) {
	const [last] = await db
		.select({ position: schema.listItems.position })
		.from(schema.listItems)
		.where(
			and(
				eq(schema.listItems.listId, listId),
				inArray(schema.listItems.status, ['unchecked', 'checked'])
			)
		)
		.orderBy(desc(schema.listItems.position))
		.limit(1)

	return (last?.position ?? -1) + 1
}

export async function getNextRecipeItemPosition(recipeId: string) {
	const [last] = await db
		.select({ position: schema.recipeItems.position })
		.from(schema.recipeItems)
		.where(eq(schema.recipeItems.recipeId, recipeId))
		.orderBy(desc(schema.recipeItems.position))
		.limit(1)

	return (last?.position ?? -1) + 1
}

export async function getNextMealPlannerDayItemPosition(mealPlannerDayId: string) {
	const [last] = await db
		.select({ position: schema.mealPlannerDayItems.position })
		.from(schema.mealPlannerDayItems)
		.where(eq(schema.mealPlannerDayItems.mealPlannerDayId, mealPlannerDayId))
		.orderBy(desc(schema.mealPlannerDayItems.position))
		.limit(1)

	return (last?.position ?? -1) + 1
}

export async function getRecipeItems(recipeId: string) {
	const rows = await db
		.select({
			recipeItem: schema.recipeItems,
			item: schema.items
		})
		.from(schema.recipeItems)
		.innerJoin(schema.items, eq(schema.items.id, schema.recipeItems.itemId))
		.where(eq(schema.recipeItems.recipeId, recipeId))
		.orderBy(asc(schema.recipeItems.position), asc(schema.recipeItems.createdAt))

	return rows.map((row) => serializeRecipeItem(row.recipeItem, row.item))
}

export async function getMealPlannerDays() {
	const rows = await db
		.select()
		.from(schema.mealPlannerDays)
		.orderBy(asc(schema.mealPlannerDays.dayOfWeek))

	return mealPlannerDayNumbers
		.map((dayOfWeek) => rows.find((row) => row.dayOfWeek === dayOfWeek))
		.filter((day): day is MealPlannerDayRow => Boolean(day))
}

export async function appendListItemsFromRows(options: {
	listId: string
	userId: number
	rows: Array<{
		item: ItemRow
		label: string | null
		amount: number | null
		unit: string | null
		note: string | null
		sourceType: schema.ListItemSourceType
		sourceRecipeId: string | null
		sourceMealPlannerDayId: string | null
	}>
}) {
	const audit = createAudit(options.userId)
	let position = await getNextListItemPosition(options.listId)
	const added = []

	for (const row of options.rows) {
		const [listItem] = await db
			.insert(schema.listItems)
			.values({
				id: createDomainId(),
				listId: options.listId,
				itemId: row.item.id,
				status: 'unchecked',
				position,
				label: row.label,
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

export function assertFound<T>(row: T | undefined): T {
	if (!row) {
		throwNotFound()
	}

	return row
}

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

export function throwNotFound(): never {
	throwApiError({
		code: 'NOT_FOUND',
		statusCode: 404,
		message: 'Niet gevonden.'
	})
}
