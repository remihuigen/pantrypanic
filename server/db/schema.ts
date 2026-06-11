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
	avatarPathname: text('avatar_pathname'),
	createdAt: integer({ mode: 'timestamp' }).notNull()
})

export const households = sqliteTable(
	'households',
	{
		id: text('id').primaryKey(),
		name: text('name').notNull(),
		createdAt: integer('created_at').notNull(),
		updatedAt: integer('updated_at').notNull()
	},
	(table) => [index('households_name_idx').on(table.name)]
)

export const householdUsers = sqliteTable(
	'household_users',
	{
		householdId: text('household_id')
			.notNull()
			.references(() => households.id),
		userId: integer('user_id')
			.notNull()
			.references(() => users.id),
		createdAt: integer('created_at').notNull()
	},
	(table) => [
		uniqueIndex('household_users_household_user_idx').on(table.householdId, table.userId),
		index('household_users_user_id_idx').on(table.userId)
	]
)

export const householdSettings = sqliteTable('household_settings', {
	householdId: text('household_id')
		.primaryKey()
		.references(() => households.id),
	refreshIntervalMs: integer('refresh_interval_ms').notNull(),
	createdAt: integer('created_at').notNull(),
	updatedAt: integer('updated_at').notNull(),
	updatedByUserId: integer('updated_by_user_id').references(() => users.id)
})

export const accessLinks = sqliteTable(
	'access_links',
	{
		id: text('id').primaryKey(),
		householdId: text('household_id')
			.notNull()
			.references(() => households.id),
		userId: integer('user_id').references(() => users.id),
		type: text('type', { enum: ['invite', 'reset'] }).notNull(),
		tokenHash: text('token_hash').notNull().unique(),
		expiresAt: integer('expires_at').notNull(),
		consumedAt: integer('consumed_at'),
		createdAt: integer('created_at').notNull(),
		createdByUserId: integer('created_by_user_id')
			.notNull()
			.references(() => users.id)
	},
	(table) => [
		index('access_links_household_type_idx').on(table.householdId, table.type),
		index('access_links_token_hash_idx').on(table.tokenHash),
		index('access_links_expires_at_idx').on(table.expiresAt)
	]
)

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
		householdId: text('household_id')
			.notNull()
			.references(() => households.id),
		name: text('name').notNull(),
		icon: text('icon'),
		status: text('status', { enum: listStatusValues }).notNull(),
		position: integer('position').notNull(),
		archivedAt: integer('archived_at'),
		deletedAt: integer('deleted_at'),
		...auditColumns
	},
	(table) => [
		index('lists_household_status_position_idx').on(
			table.householdId,
			table.status,
			table.position
		),
		index('lists_created_by_user_id_idx').on(table.createdByUserId),
		index('lists_updated_by_user_id_idx').on(table.updatedByUserId)
	]
)

export const items = sqliteTable(
	'items',
	{
		id: text('id').primaryKey(),
		householdId: text('household_id')
			.notNull()
			.references(() => households.id),
		name: text('name').notNull(),
		normalizedName: text('normalized_name').notNull(),
		defaultUnit: text('default_unit'),
		category: text('category'),
		notes: text('notes'),
		...auditColumns
	},
	(table) => [
		uniqueIndex('items_household_normalized_name_idx').on(
			table.householdId,
			table.normalizedName
		),
		index('items_name_idx').on(table.name),
		index('items_category_idx').on(table.category)
	]
)

export const recipes = sqliteTable(
	'recipes',
	{
		id: text('id').primaryKey(),
		householdId: text('household_id')
			.notNull()
			.references(() => households.id),
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
		index('recipes_household_status_idx').on(table.householdId, table.status),
		index('recipes_name_idx').on(table.name),
		index('recipes_created_by_user_id_idx').on(table.createdByUserId)
	]
)

export const mealPlannerDays = sqliteTable(
	'meal_planner_days',
	{
		id: text('id').primaryKey(),
		householdId: text('household_id')
			.notNull()
			.references(() => households.id),
		dayOfWeek: integer('day_of_week').notNull(),
		type: text('type', { enum: mealPlannerDayTypeValues }).notNull(),
		recipeId: text('recipe_id').references(() => recipes.id),
		placeholderName: text('placeholder_name'),
		placeholderNotes: text('placeholder_notes'),
		...auditColumns
	},
	(table) => [
		uniqueIndex('meal_planner_days_household_day_of_week_idx').on(
			table.householdId,
			table.dayOfWeek
		),
		index('meal_planner_days_type_idx').on(table.type),
		index('meal_planner_days_recipe_id_idx').on(table.recipeId)
	]
)

export const recipeItems = sqliteTable(
	'recipe_items',
	{
		id: text('id').primaryKey(),
		householdId: text('household_id')
			.notNull()
			.references(() => households.id),
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
		index('recipe_items_household_id_idx').on(table.householdId),
		index('recipe_items_item_id_idx').on(table.itemId)
	]
)

export const mealPlannerDayItems = sqliteTable(
	'meal_planner_day_items',
	{
		id: text('id').primaryKey(),
		householdId: text('household_id')
			.notNull()
			.references(() => households.id),
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
		index('meal_planner_day_items_household_id_idx').on(table.householdId),
		index('meal_planner_day_items_item_id_idx').on(table.itemId)
	]
)

export const listItems = sqliteTable(
	'list_items',
	{
		id: text('id').primaryKey(),
		householdId: text('household_id')
			.notNull()
			.references(() => households.id),
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
		index('list_items_household_id_idx').on(table.householdId),
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
