import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const addRouteMiddleware = vi.fn()
const loggerInfo = vi.fn()

vi.mock('@nuxt/kit', () => ({
	addRouteMiddleware,
	createResolver: () => ({
		resolve: (path: string) => `/resolved${path}`
	}),
	defineNuxtModule: (definition: unknown) => definition,
	useLogger: () => ({
		info: loggerInfo
	})
}))

describe('modules/marketing/index.ts', () => {
	beforeEach(() => {
		vi.resetModules()
		addRouteMiddleware.mockReset()
		loggerInfo.mockReset()
	})

	afterEach(() => {
		vi.clearAllMocks()
	})

	it('registers the disable middleware when marketing is off', async () => {
		const module = (await import('../../../../modules/marketing/index')).default

		await module.setup?.({ enabled: false }, {})

		expect(loggerInfo).toHaveBeenCalledWith(
			'Marketing module is disabled, adding middleware to prevent access to marketing routes'
		)
		expect(addRouteMiddleware).toHaveBeenCalledWith({
			global: true,
			name: 'marketing-disabled',
			path: '/resolved./middleware/marketing-disabled'
		})
	})

	it('does not register middleware when marketing is enabled', async () => {
		const module = (await import('../../../../modules/marketing/index')).default

		await module.setup?.({ enabled: true }, {})

		expect(addRouteMiddleware).not.toHaveBeenCalled()
		expect(loggerInfo).not.toHaveBeenCalled()
	})
})
