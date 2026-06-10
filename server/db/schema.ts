import { relations } from 'drizzle-orm'
import { index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

export const listStatusValues = ['active', 'archived', 'deleted'] as const

export const listItemStatusValues = ['unchecked', 'checked', 'archived', 'deleted'] as const

export const recipeStatusValues = ['active', 'archived', 'deleted'] as const

export const listItemSourceTypeValues = [
	'manual',
	'recipe',
	'meal_planner_recipe',
	'meal_planner_placeholder'
] as const

export const mealPlannerDayTypeValues = ['empty', 'recipe', 'placeholder'] as const

export type ListStatus = (typeof listStatusValues)[number]
export type ListItemStatus = (typeof listItemStatusValues)[number]
export type RecipeStatus = (typeof recipeStatusValues)[number]
export type ListItemSourceType = (typeof listItemSourceTypeValues)[number]
export type MealPlannerDayType = (typeof mealPlannerDayTypeValues)[number]

export const users = sqliteTable('users', {
	id: integer().primaryKey({ autoIncrement: true }),
	name: text().notNull(),
	email: text().notNull().unique(),
	password: text().notNull(),
	createdAt: integer({ mode: 'timestamp' }).notNull()
})

const auditColumns = {
	createdAt: integer('created_at').notNull(),
	updatedAt: integer('updated_at').notNull(),
	createdByUserId: integer('created_by_user_id')
		.notNull()
		.references(() => users.id),
	updatedByUserId: integer('updated_by_user_id')
		.notNull()
		.references(() => users.id)
}

export const lists = sqliteTable(
	'lists',
	{
		id: text('id').primaryKey(),
		name: text('name').notNull(),
		icon: text('icon'),
		status: text('status', { enum: listStatusValues }).notNull(),
		position: integer('position').notNull(),
		archivedAt: integer('archived_at'),
		deletedAt: integer('deleted_at'),
		...auditColumns
	},
	(table) => [
		index('lists_status_position_idx').on(table.status, table.position),
		index('lists_created_by_user_id_idx').on(table.createdByUserId),
		index('lists_updated_by_user_id_idx').on(table.updatedByUserId)
	]
)

export const items = sqliteTable(
	'items',
	{
		id: text('id').primaryKey(),
		name: text('name').notNull(),
		normalizedName: text('normalized_name').notNull(),
		defaultUnit: text('default_unit'),
		category: text('category'),
		notes: text('notes'),
		...auditColumns
	},
	(table) => [
		uniqueIndex('items_normalized_name_idx').on(table.normalizedName),
		index('items_name_idx').on(table.name),
		index('items_category_idx').on(table.category)
	]
)

export const recipes = sqliteTable(
	'recipes',
	{
		id: text('id').primaryKey(),
		name: text('name').notNull(),
		description: text('description'),
		servings: integer('servings'),
		sourceUrl: text('source_url'),
		notes: text('notes'),
		status: text('status', { enum: recipeStatusValues }).notNull(),
		archivedAt: integer('archived_at'),
		deletedAt: integer('deleted_at'),
		...auditColumns
	},
	(table) => [
		index('recipes_status_idx').on(table.status),
		index('recipes_name_idx').on(table.name),
		index('recipes_created_by_user_id_idx').on(table.createdByUserId)
	]
)

export const mealPlannerDays = sqliteTable(
	'meal_planner_days',
	{
		id: text('id').primaryKey(),
		dayOfWeek: integer('day_of_week').notNull(),
		type: text('type', { enum: mealPlannerDayTypeValues }).notNull(),
		recipeId: text('recipe_id').references(() => recipes.id),
		placeholderName: text('placeholder_name'),
		placeholderNotes: text('placeholder_notes'),
		...auditColumns
	},
	(table) => [
		uniqueIndex('meal_planner_days_day_of_week_idx').on(table.dayOfWeek),
		index('meal_planner_days_type_idx').on(table.type),
		index('meal_planner_days_recipe_id_idx').on(table.recipeId)
	]
)

export const recipeItems = sqliteTable(
	'recipe_items',
	{
		id: text('id').primaryKey(),
		recipeId: text('recipe_id')
			.notNull()
			.references(() => recipes.id),
		itemId: text('item_id')
			.notNull()
			.references(() => items.id),
		amount: real('amount'),
		unit: text('unit'),
		note: text('note'),
		position: integer('position').notNull(),
		...auditColumns
	},
	(table) => [
		index('recipe_items_recipe_id_position_idx').on(table.recipeId, table.position),
		index('recipe_items_item_id_idx').on(table.itemId)
	]
)

export const mealPlannerDayItems = sqliteTable(
	'meal_planner_day_items',
	{
		id: text('id').primaryKey(),
		mealPlannerDayId: text('meal_planner_day_id')
			.notNull()
			.references(() => mealPlannerDays.id),
		itemId: text('item_id')
			.notNull()
			.references(() => items.id),
		amount: real('amount'),
		unit: text('unit'),
		note: text('note'),
		position: integer('position').notNull(),
		...auditColumns
	},
	(table) => [
		index('meal_planner_day_items_day_id_position_idx').on(
			table.mealPlannerDayId,
			table.position
		),
		index('meal_planner_day_items_item_id_idx').on(table.itemId)
	]
)

export const listItems = sqliteTable(
	'list_items',
	{
		id: text('id').primaryKey(),
		listId: text('list_id')
			.notNull()
			.references(() => lists.id),
		itemId: text('item_id')
			.notNull()
			.references(() => items.id),
		status: text('status', { enum: listItemStatusValues }).notNull(),
		position: integer('position').notNull(),
		amount: real('amount'),
		unit: text('unit'),
		note: text('note'),
		sourceType: text('source_type', { enum: listItemSourceTypeValues }).notNull(),
		sourceRecipeId: text('source_recipe_id').references(() => recipes.id),
		sourceMealPlannerDayId: text('source_meal_planner_day_id').references(
			() => mealPlannerDays.id
		),
		checkedAt: integer('checked_at'),
		checkedByUserId: integer('checked_by_user_id').references(() => users.id),
		archivedAt: integer('archived_at'),
		archivedByUserId: integer('archived_by_user_id').references(() => users.id),
		deletedAt: integer('deleted_at'),
		deletedByUserId: integer('deleted_by_user_id').references(() => users.id),
		...auditColumns
	},
	(table) => [
		index('list_items_list_id_status_position_idx').on(
			table.listId,
			table.status,
			table.position
		),
		index('list_items_item_id_idx').on(table.itemId),
		index('list_items_status_idx').on(table.status),
		index('list_items_archived_at_idx').on(table.archivedAt),
		index('list_items_source_recipe_id_idx').on(table.sourceRecipeId),
		index('list_items_source_meal_planner_day_id_idx').on(table.sourceMealPlannerDayId),
		index('list_items_created_by_user_id_idx').on(table.createdByUserId)
	]
)

export const listsRelations = relations(lists, ({ many, one }) => ({
	createdByUser: one(users, {
		fields: [lists.createdByUserId],
		references: [users.id],
		relationName: 'listsCreatedByUser'
	}),
	updatedByUser: one(users, {
		fields: [lists.updatedByUserId],
		references: [users.id],
		relationName: 'listsUpdatedByUser'
	}),
	listItems: many(listItems)
}))

export const itemsRelations = relations(items, ({ many, one }) => ({
	createdByUser: one(users, {
		fields: [items.createdByUserId],
		references: [users.id],
		relationName: 'itemsCreatedByUser'
	}),
	updatedByUser: one(users, {
		fields: [items.updatedByUserId],
		references: [users.id],
		relationName: 'itemsUpdatedByUser'
	}),
	listItems: many(listItems),
	recipeItems: many(recipeItems),
	mealPlannerDayItems: many(mealPlannerDayItems)
}))

export const recipesRelations = relations(recipes, ({ many, one }) => ({
	createdByUser: one(users, {
		fields: [recipes.createdByUserId],
		references: [users.id],
		relationName: 'recipesCreatedByUser'
	}),
	updatedByUser: one(users, {
		fields: [recipes.updatedByUserId],
		references: [users.id],
		relationName: 'recipesUpdatedByUser'
	}),
	recipeItems: many(recipeItems),
	listItems: many(listItems),
	mealPlannerDays: many(mealPlannerDays)
}))

export const recipeItemsRelations = relations(recipeItems, ({ one }) => ({
	recipe: one(recipes, {
		fields: [recipeItems.recipeId],
		references: [recipes.id]
	}),
	item: one(items, {
		fields: [recipeItems.itemId],
		references: [items.id]
	}),
	createdByUser: one(users, {
		fields: [recipeItems.createdByUserId],
		references: [users.id],
		relationName: 'recipeItemsCreatedByUser'
	}),
	updatedByUser: one(users, {
		fields: [recipeItems.updatedByUserId],
		references: [users.id],
		relationName: 'recipeItemsUpdatedByUser'
	})
}))

export const listItemsRelations = relations(listItems, ({ one }) => ({
	list: one(lists, {
		fields: [listItems.listId],
		references: [lists.id]
	}),
	item: one(items, {
		fields: [listItems.itemId],
		references: [items.id]
	}),
	sourceRecipe: one(recipes, {
		fields: [listItems.sourceRecipeId],
		references: [recipes.id]
	}),
	sourceMealPlannerDay: one(mealPlannerDays, {
		fields: [listItems.sourceMealPlannerDayId],
		references: [mealPlannerDays.id]
	}),
	checkedByUser: one(users, {
		fields: [listItems.checkedByUserId],
		references: [users.id],
		relationName: 'listItemsCheckedByUser'
	}),
	archivedByUser: one(users, {
		fields: [listItems.archivedByUserId],
		references: [users.id],
		relationName: 'listItemsArchivedByUser'
	}),
	deletedByUser: one(users, {
		fields: [listItems.deletedByUserId],
		references: [users.id],
		relationName: 'listItemsDeletedByUser'
	}),
	createdByUser: one(users, {
		fields: [listItems.createdByUserId],
		references: [users.id],
		relationName: 'listItemsCreatedByUser'
	}),
	updatedByUser: one(users, {
		fields: [listItems.updatedByUserId],
		references: [users.id],
		relationName: 'listItemsUpdatedByUser'
	})
}))

export const mealPlannerDaysRelations = relations(mealPlannerDays, ({ many, one }) => ({
	recipe: one(recipes, {
		fields: [mealPlannerDays.recipeId],
		references: [recipes.id]
	}),
	createdByUser: one(users, {
		fields: [mealPlannerDays.createdByUserId],
		references: [users.id],
		relationName: 'mealPlannerDaysCreatedByUser'
	}),
	updatedByUser: one(users, {
		fields: [mealPlannerDays.updatedByUserId],
		references: [users.id],
		relationName: 'mealPlannerDaysUpdatedByUser'
	}),
	mealPlannerDayItems: many(mealPlannerDayItems),
	listItems: many(listItems)
}))

export const mealPlannerDayItemsRelations = relations(mealPlannerDayItems, ({ one }) => ({
	mealPlannerDay: one(mealPlannerDays, {
		fields: [mealPlannerDayItems.mealPlannerDayId],
		references: [mealPlannerDays.id]
	}),
	item: one(items, {
		fields: [mealPlannerDayItems.itemId],
		references: [items.id]
	}),
	createdByUser: one(users, {
		fields: [mealPlannerDayItems.createdByUserId],
		references: [users.id],
		relationName: 'mealPlannerDayItemsCreatedByUser'
	}),
	updatedByUser: one(users, {
		fields: [mealPlannerDayItems.updatedByUserId],
		references: [users.id],
		relationName: 'mealPlannerDayItemsUpdatedByUser'
	})
}))
