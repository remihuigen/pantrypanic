import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { isAuthenticated, requireAuthenticated } from '../../server/utils/auth'

const getUserSession = vi.fn()
const useRuntimeConfig = vi.fn()

describe('auth utilities', () => {
	beforeEach(() => {
		vi.stubGlobal('getUserSession', getUserSession)
		vi.stubGlobal('useRuntimeConfig', useRuntimeConfig)
		delete process.env.ADMIN_API_KEY
		delete process.env.ADMIN_API_TOKEN
		getUserSession.mockResolvedValue({})
		useRuntimeConfig.mockReturnValue({ adminApiKey: '', adminApiToken: '' })
	})

	afterEach(() => {
		vi.unstubAllGlobals()
	})

	it('authenticates valid admin API keys without reading the session', async () => {
		process.env.ADMIN_API_KEY = 'secret'

		await expect(isAuthenticated(createEvent('secret'))).resolves.toBe(true)

		expect(getUserSession).not.toHaveBeenCalled()
	})

	it('falls back to configured runtime admin token names', async () => {
		useRuntimeConfig.mockReturnValue({ adminApiKey: 'runtime-secret', adminApiToken: 'legacy-secret' })

		await expect(isAuthenticated(createEvent('runtime-secret'))).resolves.toBe(true)

		useRuntimeConfig.mockReturnValue({ adminApiKey: '', adminApiToken: 'legacy-secret' })
		await expect(isAuthenticated(createEvent('legacy-secret'))).resolves.toBe(true)
	})

	it('rejects missing or mismatched API keys and checks session user', async () => {
		process.env.ADMIN_API_KEY = 'secret'
		getUserSession.mockResolvedValue({ user: { id: 1 } })

		await expect(isAuthenticated(createEvent('nope'))).resolves.toBe(true)

		getUserSession.mockResolvedValue({})
		await expect(isAuthenticated(createEvent('nope'))).resolves.toBe(false)
		await expect(isAuthenticated(createEvent())).resolves.toBe(false)
	})

	it('requires authenticated requests', async () => {
		getUserSession.mockResolvedValue({ user: { id: 1 } })

		await expect(requireAuthenticated(createEvent())).resolves.toBeUndefined()

		getUserSession.mockResolvedValue({})
		await expect(requireAuthenticated(createEvent())).rejects.toMatchObject({
			statusCode: 401,
			message: 'Authentication required.'
		})
	})
})

function createEvent(apiKey?: string) {
	return {
		node: {
			req: {
				headers: apiKey ? { 'x-api-token': apiKey } : {}
			}
		}
	} as never
}
