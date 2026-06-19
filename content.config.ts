import { defineCollection, defineContentConfig } from '@nuxt/content'
import { z } from 'zod'

export default defineContentConfig({
	collections: {
		blog: defineCollection({
			type: 'page',
			source: 'blog/*.md',
			// Define custom schema for blog collection
			schema: z.object({
				title: z.string(),
				description: z.string(),
				image: z.string().nullable(),
				date: z.date(),
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
