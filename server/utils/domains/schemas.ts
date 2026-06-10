import type { H3Event } from 'h3'

import {
	domainIdSchema,
	nullableAmountSchema,
	nullableTextSchema,
	optionalAmountSchema,
	optionalTextSchema,
	orderedIdsSchema
} from '#server/utils/api-core'
import { schema } from 'hub:db'
import { z } from 'zod'

const nameSchema = z
	.string({ error: 'Naam is verplicht.' })
	.trim()
	.min(1, { error: 'Naam is verplicht.' })
	.max(120, { error: 'Naam mag maximaal 120 tekens bevatten.' })

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

const listStatusSchema = z.enum(schema.listStatusValues, { error: 'Ongeldige lijststatus.' })
const recipeStatusSchema = z.enum(schema.recipeStatusValues, { error: 'Ongeldige receptstatus.' })

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
	name: nameSchema
})

export const updateListBodySchema = z
	.strictObject({
		name: nameSchema.optional()
	})
	.refine((value) => value.name !== undefined, {
		error: 'Minimaal een veld is verplicht.'
	})

export const reorderBodySchema = orderedIdsSchema

export const createOccurrenceBodySchema = z.strictObject({
	name: nameSchema,
	label: optionalTextSchema,
	amount: optionalAmountSchema,
	unit: unitSchema,
	note: noteSchema
})

export const updateOccurrenceBodySchema = z
	.strictObject({
		label: nullableTextSchema,
		amount: nullableAmountSchema,
		unit: nullableUnitSchema,
		note: nullableNoteSchema
	})
	.refine(
		(value) =>
			value.label !== undefined ||
			value.amount !== undefined ||
			value.unit !== undefined ||
			value.note !== undefined,
		{ error: 'Minimaal een veld is verplicht.' }
	)

/**
 * Creates the item-search query schema with runtime-configured limits.
 *
 * @param event - Optional request event used to read runtime config.
 * @returns Zod schema for item search query strings.
 */
export function createItemSearchQuerySchema(event?: H3Event) {
	const { pantry } = useRuntimeConfig(event)
	const defaultLimit = pantry.defaultItemSearchLimit
	const maxLimit = pantry.maxItemSearchLimit

	return z.strictObject({
		q: z
			.string({ error: 'Zoekterm is verplicht.' })
			.trim()
			.min(1, { error: 'Zoekterm is verplicht.' })
			.max(120, { error: 'Zoekterm mag maximaal 120 tekens bevatten.' }),
		limit: z.coerce
			.number({ error: 'Limiet moet een getal zijn.' })
			.int({ error: 'Limiet moet een getal zijn.' })
			.min(1, { error: 'Limiet moet minimaal 1 zijn.' })
			.max(maxLimit, { error: `Limiet mag maximaal ${maxLimit} zijn.` })
			.default(defaultLimit)
	})
}

/**
 * Creates the item-suggestions query schema with runtime-configured limits.
 *
 * @param event - Optional request event used to read runtime config.
 * @returns Zod schema for item suggestions query strings.
 */
export function createItemSuggestionsQuerySchema(event?: H3Event) {
	const { pantry } = useRuntimeConfig(event)
	const defaultLimit = pantry.defaultItemSearchLimit
	const maxLimit = pantry.maxItemSearchLimit

	return z.strictObject({
		limit: z.coerce
			.number({ error: 'Limiet moet een getal zijn.' })
			.int({ error: 'Limiet moet een getal zijn.' })
			.min(1, { error: 'Limiet moet minimaal 1 zijn.' })
			.max(maxLimit, { error: `Limiet mag maximaal ${maxLimit} zijn.` })
			.default(defaultLimit),
		listId: domainIdSchema.optional()
	})
}

export type ItemSearchQuery = z.infer<ReturnType<typeof createItemSearchQuerySchema>>
export type ItemSuggestionsQuery = z.infer<ReturnType<typeof createItemSuggestionsQuerySchema>>

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
