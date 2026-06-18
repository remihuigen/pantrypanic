import { defineCollection, defineContentConfig } from '@nuxt/content'
import { z } from 'zod'

export default defineContentConfig({
	collections: {
		blog: defineCollection({
			type: 'page',
			source: 'blog/*.md',
			// Define custom schema for blog collection
			schema: z.object({
				date: z.date()
			})
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
