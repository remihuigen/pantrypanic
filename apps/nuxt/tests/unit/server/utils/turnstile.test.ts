import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const hasValidAdminApiKey = vi.fn()
const getRequestHeader = vi.fn()
const verifyTurnstileToken = vi.fn()

vi.mock('#server/utils/auth', () => ({
	hasValidAdminApiKey
}))

describe('server/utils/turnstile.ts', () => {
	beforeEach(() => {
		vi.resetModules()
		hasValidAdminApiKey.mockReset()
		getRequestHeader.mockReset()
		verifyTurnstileToken.mockReset()
		vi.stubGlobal('getRequestHeader', getRequestHeader)
		vi.stubGlobal('verifyTurnstileToken', verifyTurnstileToken)
		vi.stubGlobal('createError', (error: Record<string, unknown>) => error)
	})

	afterEach(() => {
		vi.unstubAllGlobals()
	})

	it('bypasses validation for admin api key requests', async () => {
		hasValidAdminApiKey.mockReturnValue(true)
		vi.stubGlobal('useRuntimeConfig', () => ({
			turnstile: { enabled: true, secretKey: 'secret' }
		}))

		const { assertTurnstileToken } = await import('#server/utils/turnstile')

		await expect(assertTurnstileToken({} as never, 'join_household')).resolves.toBeUndefined()
		expect(getRequestHeader).not.toHaveBeenCalled()
	})

	it('returns early when turnstile is disabled', async () => {
		hasValidAdminApiKey.mockReturnValue(false)
		vi.stubGlobal('useRuntimeConfig', () => ({
			turnstile: { enabled: false, secretKey: 'secret' }
		}))

		const { assertTurnstileToken } = await import('#server/utils/turnstile')

		await expect(assertTurnstileToken({} as never, 'join_household')).resolves.toBeUndefined()
	})

	it('handles missing secret keys according to the current dev mode', async () => {
		hasValidAdminApiKey.mockReturnValue(false)
		vi.stubGlobal('useRuntimeConfig', () => ({
			turnstile: { enabled: true, secretKey: '   ' }
		}))

		const { assertTurnstileToken } = await import('#server/utils/turnstile')

		await expect(assertTurnstileToken({} as never, 'join_household')).rejects.toMatchObject({
			statusCode: 500,
			data: {
				code: 'TURNSTILE_SERVER_MISCONFIGURED',
				expectedAction: 'join_household'
			}
		})
	})

	it('rejects requests without a token header', async () => {
		hasValidAdminApiKey.mockReturnValue(false)
		getRequestHeader.mockReturnValue(undefined)
		vi.stubGlobal('useRuntimeConfig', () => ({
			turnstile: { enabled: true, secretKey: 'secret' }
		}))

		const { assertTurnstileToken } = await import('#server/utils/turnstile')

		await expect(assertTurnstileToken({} as never, 'join_household')).rejects.toMatchObject({
			statusCode: 400,
			data: {
				code: 'TURNSTILE_TOKEN_MISSING'
			}
		})
	})

	it('wraps unexpected verification failures in a 502 api error', async () => {
		hasValidAdminApiKey.mockReturnValue(false)
		getRequestHeader.mockReturnValue('token')
		verifyTurnstileToken.mockRejectedValue(new Error('network'))
		vi.stubGlobal('useRuntimeConfig', () => ({
			turnstile: { enabled: true, secretKey: 'secret' }
		}))

		const { assertTurnstileToken } = await import('#server/utils/turnstile')

		await expect(assertTurnstileToken({} as never, 'join_household')).rejects.toMatchObject({
			statusCode: 502,
			data: {
				code: 'TURNSTILE_VALIDATION_UNAVAILABLE',
				expectedAction: 'join_household'
			}
		})
	})

	it('rejects failed or mismatched verification responses', async () => {
		hasValidAdminApiKey.mockReturnValue(false)
		getRequestHeader.mockReturnValue('token')
		vi.stubGlobal('useRuntimeConfig', () => ({
			turnstile: { enabled: true, secretKey: 'secret' }
		}))

		const { assertTurnstileToken } = await import('#server/utils/turnstile')

		verifyTurnstileToken.mockResolvedValueOnce({ success: false })
		await expect(assertTurnstileToken({} as never, 'join_household')).rejects.toMatchObject({
			statusCode: 403,
			data: {
				code: 'TURNSTILE_VALIDATION_FAILED',
				expectedAction: 'join_household'
			}
		})

		verifyTurnstileToken.mockResolvedValueOnce({ success: true, action: 'wrong' })
		await expect(assertTurnstileToken({} as never, 'join_household')).rejects.toMatchObject({
			statusCode: 403,
			data: {
				code: 'TURNSTILE_ACTION_MISMATCH',
				expectedAction: 'join_household'
			}
		})
	})

	it('accepts successful verification responses', async () => {
		hasValidAdminApiKey.mockReturnValue(false)
		getRequestHeader.mockReturnValue('token')
		verifyTurnstileToken.mockResolvedValue({ success: true, action: 'join_household' })
		vi.stubGlobal('useRuntimeConfig', () => ({
			turnstile: { enabled: true, secretKey: 'secret' }
		}))

		const { assertTurnstileToken } = await import('#server/utils/turnstile')

		await expect(assertTurnstileToken({} as never, 'join_household')).resolves.toBeUndefined()
		expect(verifyTurnstileToken).toHaveBeenCalledWith('token', {})
	})
})
