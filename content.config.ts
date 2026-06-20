import { defineCollection, defineContentConfig } from '@nuxt/content'
import { z } from 'zod'

const editorialBaseSchema = z.object({
	title: z.string(),
	shortTitle: z.string().optional(),
	description: z.string(),
	date_created: z.coerce.date(),
	date_updated: z.coerce.date()
})

export default defineContentConfig({
	collections: {
		blog: defineCollection({
			type: 'page',
			source: 'blog/*.md',
			schema: editorialBaseSchema.extend({
				tags: z.array(z.string()),
				authors: z.array(
					z.object({
						name: z.string(),
						avatar: z.string(),
						to: z.url()
					})
				)
			})
		}),
		legal: defineCollection({
			type: 'page',
			source: 'legal/*.md',
			schema: editorialBaseSchema
		}),
		faqs: defineCollection({
			source: 'faqs/**.yml',
			type: 'data',
			schema: z.object({
				category: z.enum(['marketing', 'support']),
				label: z.string(),
				content: z.string()
			})
		})
	}
})
