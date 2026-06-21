import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, ref } from 'vue'
import { getIcon } from '#shared/utils/icons'

const toast = {
	add: vi.fn()
}

describe('useTurnstile', () => {
	beforeEach(() => {
		vi.useRealTimers()
		vi.resetModules()
		toast.add.mockReset()
		vi.stubGlobal('computed', computed)
		vi.stubGlobal('ref', ref)
		vi.stubGlobal('useToast', () => toast)
	})

	afterEach(() => {
		vi.useRealTimers()
		vi.unstubAllGlobals()
	})

	it('disables turnstile when runtime config is incomplete', async () => {
		vi.stubGlobal('useRuntimeConfig', () => ({
			public: {
				turnstile: {
					enabled: true,
					siteKey: '   '
				}
			}
		}))

		const { useTurnstile } = await import('~/composables/useTurnstile')
		const turnstile = useTurnstile()

		expect(turnstile.isEnabled.value).toBe(false)
		expect(turnstile.isReady()).toBe(true)
		await expect(turnstile.getTokenWithRetry()).resolves.toBeUndefined()
	})

	it('retrieves a trimmed token and retries until one is available', async () => {
		vi.useFakeTimers()
		vi.stubGlobal('useRuntimeConfig', () => ({
			public: {
				turnstile: {
					enabled: true,
					siteKey: 'site-key'
				}
			}
		}))

		const { useTurnstile } = await import('~/composables/useTurnstile')
		const turnstile = useTurnstile()
		const tokenPromise = turnstile.getTokenWithRetry(2, 50)

		await vi.advanceTimersByTimeAsync(50)
		turnstile.token.value = '  token-123  '
		await vi.advanceTimersByTimeAsync(50)

		await expect(tokenPromise).resolves.toBe('token-123')
		expect(turnstile.getToken()).toBe('token-123')
		expect(turnstile.isReady()).toBe(true)
	})

	it('resets token state and only resets the widget when enabled', async () => {
		vi.stubGlobal('useRuntimeConfig', () => ({
			public: {
				turnstile: {
					enabled: true,
					siteKey: 'site-key'
				}
			}
		}))

		const { useTurnstile } = await import('~/composables/useTurnstile')
		const turnstile = useTurnstile()
		const instance = { reset: vi.fn() }

		turnstile.token.value = 'token-123'
		turnstile.reset(instance)

		expect(turnstile.token.value).toBeUndefined()
		expect(instance.reset).toHaveBeenCalledTimes(1)
	})

	it('shows pending and missing-token toast hints', async () => {
		vi.stubGlobal('useRuntimeConfig', () => ({
			public: {
				turnstile: {
					enabled: true,
					siteKey: 'site-key'
				}
			}
		}))

		const { useTurnstile } = await import('~/composables/useTurnstile')
		const turnstile = useTurnstile()

		turnstile.showPendingHint()
		turnstile.showMissingTokenErrorHint()

		expect(toast.add).toHaveBeenNthCalledWith(
			1,
			expect.objectContaining({
				title: 'Even wachten…',
				icon: getIcon('warn')
			})
		)
		expect(toast.add).toHaveBeenNthCalledWith(
			2,
			expect.objectContaining({
				title: 'Beveilivingscontrole mislukt',
				icon: getIcon('error')
			})
		)
	})

	it('captures nested turnstile error payloads and ignores unrelated errors', async () => {
		vi.stubGlobal('useRuntimeConfig', () => ({
			public: {
				turnstile: {
					enabled: true,
					siteKey: 'site-key'
				}
			}
		}))

		const { useTurnstile } = await import('~/composables/useTurnstile')
		const turnstile = useTurnstile()

		expect(
			turnstile.captureTurnstileError({
				data: {
					data: {
						code: 'TURNSTILE_VALIDATION_FAILED'
					}
				}
			})
		).toBe(true)
		expect(toast.add).toHaveBeenCalledTimes(1)
		expect(turnstile.captureTurnstileError(new Error('boom'))).toBe(false)
	})
})
