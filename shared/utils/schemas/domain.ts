import { z } from 'zod'

export type EntityMap<T> = Record<string, T>

export const listStatusSchema = z.enum(['active', 'archived', 'deleted'], {
	error: 'Ongeldige lijststatus.'
})

export const listItemStatusSchema = z.enum(['unchecked', 'checked', 'archived', 'deleted'], {
	error: 'Ongeldige lijstitemstatus.'
})

export const recipeStatusSchema = z.enum(['active', 'archived', 'deleted'], {
	error: 'Ongeldige receptstatus.'
})

export const listItemSourceTypeSchema = z.enum(
	['manual', 'recipe', 'meal_planner_recipe', 'meal_planner_placeholder'],
	{ error: 'Ongeldige bron voor lijstitem.' }
)

export const mealPlannerDayTypeSchema = z.enum(['empty', 'recipe', 'placeholder'], {
	error: 'Ongeldig dagtype.'
})

export const domainIdSchema = z
	.string({ error: 'Id is verplicht.' })
	.trim()
	.min(1, { error: 'Id is verplicht.' })
	.max(200, { error: 'Ongeldige id.' })

export const optionalTextSchema = z
	.string({ error: 'Waarde moet tekst zijn.' })
	.trim()
	.max(500, { error: 'Waarde mag maximaal 500 tekens bevatten.' })
	.optional()

export const nullableTextSchema = z
	.string({ error: 'Waarde moet tekst zijn.' })
	.trim()
	.max(500, { error: 'Waarde mag maximaal 500 tekens bevatten.' })
	.nullable()
	.optional()

export const optionalAmountSchema = z
	.number({ error: 'Aantal moet een getal zijn.' })
	.positive({ error: 'Aantal moet groter zijn dan 0.' })
	.optional()

export const nullableAmountSchema = z
	.number({ error: 'Aantal moet een getal zijn.' })
	.positive({ error: 'Aantal moet groter zijn dan 0.' })
	.nullable()
	.optional()

export const orderedIdsSchema = z.strictObject({
	orderedIds: z
		.array(domainIdSchema, { error: 'Volgorde is verplicht.' })
		.min(1, { error: 'Volgorde is verplicht.' })
})

const nameSchema = z
	.string({ error: 'Naam is verplicht.' })
	.trim()
	.min(1, { error: 'Naam is verplicht.' })
	.max(120, { error: 'Naam mag maximaal 120 tekens bevatten.' })

const listIconSchema = z
	.string({ error: 'Icoon moet tekst zijn.' })
	.trim()
	.min(1, { error: 'Icoon is verplicht.' })
	.max(120, { error: 'Icoon mag maximaal 120 tekens bevatten.' })

const unitSchema = z
	.string({ error: 'Eenheid moet tekst zijn.' })
	.trim()
	.max(40, { error: 'Eenheid mag maximaal 40 tekens bevatten.' })
	.optional()

const nullableUnitSchema = z
	.string({ error: 'Eenheid moet tekst zijn.' })
	.trim()
	.max(40, { error: 'Eenheid mag maximaal 40 tekens bevatten.' })
	.nullable()
	.optional()

const noteSchema = z
	.string({ error: 'Notitie moet tekst zijn.' })
	.trim()
	.max(1000, { error: 'Notitie mag maximaal 1000 tekens bevatten.' })
	.optional()

const nullableNoteSchema = z
	.string({ error: 'Notitie moet tekst zijn.' })
	.trim()
	.max(1000, { error: 'Notitie mag maximaal 1000 tekens bevatten.' })
	.nullable()
	.optional()

export const listParamsSchema = z.strictObject({ listId: domainIdSchema })
export const listItemParamsSchema = z.strictObject({ listItemId: domainIdSchema })
export const recipeParamsSchema = z.strictObject({ recipeId: domainIdSchema })
export const recipeItemParamsSchema = z.strictObject({ recipeItemId: domainIdSchema })
export const mealPlannerDayItemParamsSchema = z.strictObject({
	mealPlannerDayItemId: domainIdSchema
})
export const mealPlannerDayParamsSchema = z.strictObject({
	dayOfWeek: z.coerce
		.number({ error: 'Dag moet een waarde van 1 tot en met 7 zijn.' })
		.int({ error: 'Dag moet een waarde van 1 tot en met 7 zijn.' })
		.min(1, { error: 'Dag moet een waarde van 1 tot en met 7 zijn.' })
		.max(7, { error: 'Dag moet een waarde van 1 tot en met 7 zijn.' })
})

export const listQuerySchema = z.strictObject({
	status: listStatusSchema.default('active')
})

export const createListBodySchema = z.strictObject({
	name: nameSchema,
	icon: listIconSchema.optional()
})

export const updateListBodySchema = z
	.strictObject({
		name: nameSchema.optional(),
		icon: listIconSchema.nullable().optional()
	})
	.refine((value) => value.name !== undefined || value.icon !== undefined, {
		error: 'Minimaal een veld is verplicht.'
	})

export const reorderBodySchema = orderedIdsSchema

export const createOccurrenceBodySchema = z.strictObject({
	name: nameSchema,
	amount: optionalAmountSchema,
	unit: unitSchema,
	note: noteSchema
})

export const updateOccurrenceBodySchema = z
	.strictObject({
		amount: nullableAmountSchema,
		unit: nullableUnitSchema,
		note: nullableNoteSchema
	})
	.refine(
		(value) =>
			value.amount !== undefined || value.unit !== undefined || value.note !== undefined,
		{ error: 'Minimaal een veld is verplicht.' }
	)

export const updateListItemBodySchema = z
	.strictObject({
		listId: domainIdSchema.optional(),
		name: nameSchema.optional(),
		amount: nullableAmountSchema,
		unit: nullableUnitSchema,
		note: nullableNoteSchema
	})
	.refine(
		(value) =>
			value.listId !== undefined ||
			value.name !== undefined ||
			value.amount !== undefined ||
			value.unit !== undefined ||
			value.note !== undefined,
		{ error: 'Minimaal een veld is verplicht.' }
	)

const recipeIngredientSchema = createOccurrenceBodySchema.extend({
	position: z
		.number({ error: 'Positie moet een getal zijn.' })
		.int({ error: 'Positie moet een getal zijn.' })
		.min(0, { error: 'Positie mag niet negatief zijn.' })
		.optional()
})

export const recipeQuerySchema = z.strictObject({
	status: recipeStatusSchema.default('active'),
	q: z.string({ error: 'Zoekterm moet tekst zijn.' }).trim().max(120).optional()
})

export const createRecipeBodySchema = z.strictObject({
	name: nameSchema,
	description: optionalTextSchema,
	servings: z
		.number({ error: 'Porties moet een getal zijn.' })
		.int({ error: 'Porties moet een getal zijn.' })
		.positive({ error: 'Porties moet groter zijn dan 0.' })
		.optional(),
	sourceUrl: z.url({ error: 'Bron moet een geldige URL zijn.' }).optional(),
	notes: noteSchema,
	items: z
		.array(recipeIngredientSchema, { error: 'Ingrediënten moeten een lijst zijn.' })
		.optional()
})

export const updateRecipeBodySchema = z
	.strictObject({
		name: nameSchema.optional(),
		description: nullableTextSchema,
		servings: z
			.number({ error: 'Porties moet een getal zijn.' })
			.int({ error: 'Porties moet een getal zijn.' })
			.positive({ error: 'Porties moet groter zijn dan 0.' })
			.nullable()
			.optional(),
		sourceUrl: z.url({ error: 'Bron moet een geldige URL zijn.' }).nullable().optional(),
		notes: nullableNoteSchema
	})
	.refine(
		(value) =>
			value.name !== undefined ||
			value.description !== undefined ||
			value.servings !== undefined ||
			value.sourceUrl !== undefined ||
			value.notes !== undefined,
		{ error: 'Minimaal een veld is verplicht.' }
	)

export const addRecipeToListBodySchema = z.strictObject({
	listId: domainIdSchema
})

export const mealPlannerDayBodySchema = z.discriminatedUnion(
	'type',
	[
		z.strictObject({
			type: z.literal('empty')
		}),
		z.strictObject({
			type: z.literal('recipe'),
			recipeId: domainIdSchema
		}),
		z.strictObject({
			type: z.literal('placeholder'),
			placeholderName: nameSchema,
			placeholderNotes: nullableNoteSchema
		})
	],
	{ error: 'Ongeldig dagtype.' }
)

const timestampSchema = z.number().int()

export const shoppingListSchema = z.strictObject({
	id: domainIdSchema,
	name: z.string(),
	icon: z.string().optional(),
	status: listStatusSchema,
	position: z.number().int(),
	createdAt: timestampSchema,
	updatedAt: timestampSchema,
	archivedAt: timestampSchema.optional(),
	deletedAt: timestampSchema.optional()
})

export const canonicalItemSchema = z.strictObject({
	id: domainIdSchema,
	name: z.string(),
	defaultUnit: z.string().optional()
})

export const itemSuggestionSchema = canonicalItemSchema.extend({
	usageCount: z.number().int(),
	lastUsedAt: timestampSchema.optional()
})

export const listItemSchema = z.strictObject({
	id: domainIdSchema,
	listId: domainIdSchema,
	itemId: domainIdSchema,
	name: z.string(),
	amount: z.number().optional(),
	unit: z.string().optional(),
	note: z.string().optional(),
	status: listItemStatusSchema,
	position: z.number().int(),
	sourceType: listItemSourceTypeSchema,
	checkedAt: timestampSchema.optional(),
	updatedAt: timestampSchema.optional(),
	deletedAt: timestampSchema.optional()
})

export const recipeSummarySchema = z.strictObject({
	id: domainIdSchema,
	name: z.string(),
	description: z.string().optional(),
	servings: z.number().int().optional(),
	status: recipeStatusSchema,
	updatedAt: timestampSchema
})

export const recipeItemSchema = z.strictObject({
	id: domainIdSchema,
	recipeId: domainIdSchema,
	itemId: domainIdSchema,
	name: z.string(),
	amount: z.number().optional(),
	unit: z.string().optional(),
	note: z.string().optional(),
	position: z.number().int(),
	updatedAt: timestampSchema.optional()
})

export const recipeDetailSchema = z.strictObject({
	id: domainIdSchema,
	name: z.string(),
	description: z.string().optional(),
	servings: z.number().int().optional(),
	sourceUrl: z.string().optional(),
	notes: z.string().optional(),
	status: recipeStatusSchema,
	items: z.array(recipeItemSchema)
})

export const mealPlannerDayItemSchema = z.strictObject({
	id: domainIdSchema,
	itemId: domainIdSchema,
	name: z.string(),
	amount: z.number().optional(),
	unit: z.string().optional(),
	note: z.string().optional(),
	position: z.number().int(),
	updatedAt: timestampSchema.optional()
})

export const mealPlannerDaySchema = z.strictObject({
	id: domainIdSchema,
	dayOfWeek: z.number().int().min(1).max(7),
	type: mealPlannerDayTypeSchema,
	recipe: z
		.strictObject({
			id: domainIdSchema,
			name: z.string()
		})
		.optional(),
	recipeId: domainIdSchema.optional(),
	placeholderName: z.string().optional(),
	placeholderNotes: z.string().optional(),
	items: z.array(mealPlannerDayItemSchema).optional()
})

export const currentUserSchema = z.strictObject({
	id: z.string(),
	username: z.string(),
	displayName: z.string()
})

export const userEmailSchema = z.email('Ongeldig e-mailadres.').trim().toLowerCase()

export const passwordSchema = z
	.string()
	.min(8, 'Wachtwoord moet minimaal 8 tekens bevatten.')
	.max(1024, 'Wachtwoord mag maximaal 1024 tekens bevatten.')
export const userSchema = z.strictObject({
	name: z.string().trim().min(1).max(120, 'Naam mag maximaal 120 tekens bevatten.'),
	email: userEmailSchema,
	password: passwordSchema
})

export type ListStatus = z.infer<typeof listStatusSchema>
export type ListItemStatus = z.infer<typeof listItemStatusSchema>
export type RecipeStatus = z.infer<typeof recipeStatusSchema>
export type ListItemSourceType = z.infer<typeof listItemSourceTypeSchema>
export type MealPlannerDayType = z.infer<typeof mealPlannerDayTypeSchema>

export type ShoppingList = z.infer<typeof shoppingListSchema>
export type CanonicalItem = z.infer<typeof canonicalItemSchema>
export type ItemSuggestion = z.infer<typeof itemSuggestionSchema>
export type ListItem = z.infer<typeof listItemSchema>
export type RecipeSummary = z.infer<typeof recipeSummarySchema>
export type RecipeItem = z.infer<typeof recipeItemSchema>
export type RecipeDetail = z.infer<typeof recipeDetailSchema>
export type MealPlannerDayItem = z.infer<typeof mealPlannerDayItemSchema>
export type MealPlannerDay = z.infer<typeof mealPlannerDaySchema>
export type CurrentUser = z.infer<typeof currentUserSchema>

export type CreateListInput = z.infer<typeof createListBodySchema>
export type UpdateListInput = z.infer<typeof updateListBodySchema>
export type OccurrenceInput = z.infer<typeof createOccurrenceBodySchema>
export type UpdateOccurrenceInput = z.infer<typeof updateOccurrenceBodySchema>
export type UpdateListItemInput = z.infer<typeof updateListItemBodySchema>
export type CreateRecipeInput = z.infer<typeof createRecipeBodySchema>
export type UpdateRecipeInput = z.infer<typeof updateRecipeBodySchema>
export type MealPlannerDayInput = z.infer<typeof mealPlannerDayBodySchema>
