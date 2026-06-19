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

	it('defines blog and faq collections with the expected schemas', async () => {
		const config = (await import('../../content.config')).default

		expect(Object.keys(config.collections)).toEqual(['blog', 'faqs'])
		expect(config.collections.blog).toMatchObject({
			type: 'page',
			source: 'blog/*.md'
		})
		expect(config.collections.faqs).toMatchObject({
			type: 'data',
			source: 'faqs/**.yml'
		})
		expect(config.collections.blog.schema.parse({ date: new Date() })).toBeTruthy()
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
