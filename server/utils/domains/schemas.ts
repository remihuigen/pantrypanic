import type { H3Event } from 'h3'

import { domainIdSchema } from '#shared/utils/schemas/domain'
import { z } from 'zod'

export {
	addRecipeToListBodySchema,
	categorizedReorderBodySchema,
	createCategoryBodySchema,
	createListBodySchema,
	createOccurrenceBodySchema,
	createRecipeItemBodySchema,
	createRecipeBodySchema,
	listItemParamsSchema,
	listParamsSchema,
	listQuerySchema,
	mealPlannerDayBodySchema,
	mealPlannerDayItemParamsSchema,
	mealPlannerDayParamsSchema,
	recipeItemParamsSchema,
	recipeParamsSchema,
	recipeQuerySchema,
	reorderBodySchema,
	mergeCategoryBodySchema,
	updateCategoryBodySchema,
	updateListBodySchema,
	updateListItemBodySchema,
	updateOccurrenceBodySchema,
	updateRecipeItemBodySchema,
	updateRecipeBodySchema
} from '#shared/utils/schemas/domain'

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
