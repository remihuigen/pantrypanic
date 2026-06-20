import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@nuxt/content', () => ({
	defineCollection: (config: unknown) => config,
	defineContentConfig: (config: unknown) => config
}))

describe('content.config.ts', () => {
	beforeEach(() => {
		vi.resetModules()
	})

	afterEach(() => {
		vi.clearAllMocks()
	})

	it('defines blog, legal, and faq collections with the expected schemas', async () => {
		const config = (await import('../../content.config')).default

		expect(Object.keys(config.collections)).toEqual(['blog', 'legal', 'faqs'])
		expect(config.collections.blog).toMatchObject({
			type: 'page',
			source: 'blog/*.md'
		})
		expect(config.collections.legal).toMatchObject({
			type: 'page',
			source: 'legal/*.md'
		})
		expect(config.collections.faqs).toMatchObject({
			type: 'data',
			source: 'faqs/**.yml'
		})
		expect(
			config.collections.blog.schema.parse({
				title: 'Pantry Panic launch',
				shortTitle: 'Launch',
				description: 'How the project structure supports marketing content.',
				date_created: new Date(),
				date_updated: new Date(),
				tags: ['nuxt', 'content'],
				authors: [
					{
						name: 'Remi',
						avatar: '/authors/remi.jpg',
						to: 'https://example.com/authors/remi'
					}
				]
			})
		).toMatchObject({
			title: 'Pantry Panic launch',
			shortTitle: 'Launch',
			description: 'How the project structure supports marketing content.',
			date_created: expect.any(Date),
			date_updated: expect.any(Date),
			tags: ['nuxt', 'content']
		})
		expect(
			config.collections.legal.schema.parse({
				title: 'Privacy Policy',
				description: 'How Pantry Panic handles your data.',
				date_created: new Date(),
				date_updated: new Date()
			})
		).toMatchObject({
			title: 'Privacy Policy',
			description: 'How Pantry Panic handles your data.',
			date_created: expect.any(Date),
			date_updated: expect.any(Date)
		})
		expect(
			config.collections.faqs.schema.parse({
				category: 'marketing',
				label: 'Pricing',
				content: 'Answer'
			})
		).toMatchObject({
			category: 'marketing',
			label: 'Pricing',
			content: 'Answer'
		})
		expect(() =>
			config.collections.faqs.schema.parse({
				category: 'other',
				label: 'Pricing',
				content: 'Answer'
			})
		).toThrow()
	})
})
