import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('modules/marketing/middleware/marketing-disabled.ts', () => {
	beforeEach(() => {
		vi.resetModules()
		vi.stubGlobal('defineNuxtRouteMiddleware', (middleware: unknown) => middleware)
		vi.stubGlobal('navigateTo', vi.fn((to: string) => ({ to })))
	})

	afterEach(() => {
		vi.unstubAllGlobals()
	})

	it('redirects known marketing routes to login', async () => {
		const middleware = (await import('../../../../../modules/marketing/middleware/marketing-disabled')).default

		expect(middleware({ path: '/' }, { path: '/from' })).toEqual({ to: '/login' })
		expect(middleware({ path: '/blog/post' }, { path: '/from' })).toEqual({ to: '/login' })
		expect(middleware({ path: '/legal/privacy-policy' }, { path: '/from' })).toEqual({
			to: '/login'
		})
	})

	it('allows non-marketing routes to continue', async () => {
		const middleware = (await import('../../../../../modules/marketing/middleware/marketing-disabled')).default

		expect(middleware({ path: '/app/lists' }, { path: '/from' })).toBeUndefined()
	})
})
