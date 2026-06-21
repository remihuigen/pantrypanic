import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
	queryCollection: vi.fn()
}))

vi.mock('@nuxt/content/server', () => ({
	queryCollection: mocks.queryCollection
}))

describe('layer/marketing/server/api/content/footer.get.ts', () => {
	beforeEach(() => {
		mocks.queryCollection.mockReset()
		vi.resetModules()
		vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
	})

	afterEach(() => {
		vi.unstubAllGlobals()
	})

	it('returns mapped footer links from the blog and legal collections', async () => {
		const blogBuilder = {
			order: vi.fn(),
			limit: vi.fn(),
			all: vi.fn(async () => [
				{
					title: 'Long Blog Title',
					shortTitle: 'Short Blog',
					path: '/blog/short-blog'
				},
				{
					title: 'Fallback Blog Title',
					path: '/blog/fallback-blog'
				}
			])
		}
		const legalBuilder = {
			all: vi.fn(async () => [
				{ title: 'Privacy Policy', path: '/legal/privacy-policy' },
				{ title: 'Terms of Service', path: '/legal/terms-of-service' }
			])
		}

		blogBuilder.order.mockReturnValue(blogBuilder)
		blogBuilder.limit.mockReturnValue(blogBuilder)
		mocks.queryCollection.mockImplementation((_event, collection) => {
			return collection === 'blog' ? blogBuilder : legalBuilder
		})

		const handler = (await import('~/../layer/marketing/server/api/content/footer.get')).default
		const event = {} as never

		await expect(handler(event)).resolves.toEqual({
			blog: [
				{ label: 'Short Blog', to: '/blog/short-blog' },
				{ label: 'Fallback Blog Title', to: '/blog/fallback-blog' }
			],
			legal: [
				{ label: 'Privacy Policy', to: '/legal/privacy-policy' },
				{ label: 'Terms of Service', to: '/legal/terms-of-service' }
			]
		})

		expect(mocks.queryCollection).toHaveBeenNthCalledWith(1, event, 'blog')
		expect(mocks.queryCollection).toHaveBeenNthCalledWith(2, event, 'legal')
		expect(blogBuilder.order).toHaveBeenCalledWith('dateCreated', 'DESC')
		expect(blogBuilder.limit).toHaveBeenCalledWith(5)
		expect(blogBuilder.all).toHaveBeenCalledTimes(1)
		expect(legalBuilder.all).toHaveBeenCalledTimes(1)
	})
})
