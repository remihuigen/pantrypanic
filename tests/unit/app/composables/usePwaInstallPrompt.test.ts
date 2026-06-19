import {
	detectStandalonePwaContext,
	usePwaInstallPrompt
} from '~/composables/usePwaInstallPrompt'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, shallowRef } from 'vue'

type MediaQueryListMock = {
	addEventListener: ReturnType<typeof vi.fn>
	matches: boolean
	removeEventListener: ReturnType<typeof vi.fn>
}

describe('usePwaInstallPrompt', () => {
	beforeEach(() => {
		vi.stubGlobal('computed', computed)
		vi.stubGlobal('shallowRef', shallowRef)
		vi.stubGlobal('onMounted', (callback: () => void) => callback())
		vi.stubGlobal('onUnmounted', vi.fn())
	})

	afterEach(() => {
		vi.unstubAllGlobals()
	})

	it('detects standalone display contexts', () => {
		expect(
			detectStandalonePwaContext({
				matchMedia: vi.fn((query: string) => ({
					matches: query === '(display-mode: standalone)',
					addEventListener: vi.fn(),
					removeEventListener: vi.fn()
				})),
				navigator: {}
			} as unknown as Window)
		).toBe(true)

		expect(
			detectStandalonePwaContext({
				matchMedia: vi.fn(() => ({
					matches: false,
					addEventListener: vi.fn(),
					removeEventListener: vi.fn()
				})),
				navigator: { standalone: true }
			} as unknown as Window)
		).toBe(true)
	})

	it('suppresses the install prompt once the app is known to be installed', () => {
		const storage = shallowRef(false)
		const pwa = {
			cancelInstall: vi.fn(),
			install: vi.fn(),
			showInstallPrompt: true
		}
		const mediaQueries = new Map<string, MediaQueryListMock>([
			[
				'(display-mode: standalone)',
				{
					matches: true,
					addEventListener: vi.fn(),
					removeEventListener: vi.fn()
				}
			],
			[
				'(display-mode: fullscreen)',
				{
					matches: false,
					addEventListener: vi.fn(),
					removeEventListener: vi.fn()
				}
			]
		])

		vi.stubGlobal('useNuxtApp', () => ({ $pwa: pwa }))
		vi.stubGlobal('useLocalStorage', vi.fn(() => storage))
		vi.stubGlobal(
			'window',
			{
				addEventListener: vi.fn(),
				matchMedia: vi.fn((query: string) => mediaQueries.get(query)),
				navigator: {}
			} satisfies Partial<Window>
		)
		vi.stubGlobal(
			'document',
			{
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
				visibilityState: 'visible'
			} satisfies Partial<Document>
		)

		const installPrompt = usePwaInstallPrompt()

		expect(storage.value).toBe(true)
		expect(installPrompt.isStandaloneContext.value).toBe(true)
		expect(installPrompt.canShowInstallPrompt.value).toBe(false)
	})

	it('only calls install when the prompt is actually allowed', async () => {
		const storage = shallowRef(false)
		const pwa = {
			cancelInstall: vi.fn(),
			install: vi.fn().mockResolvedValue(undefined),
			showInstallPrompt: true
		}
		const mediaQueries = new Map<string, MediaQueryListMock>([
			[
				'(display-mode: standalone)',
				{
					matches: false,
					addEventListener: vi.fn(),
					removeEventListener: vi.fn()
				}
			],
			[
				'(display-mode: fullscreen)',
				{
					matches: false,
					addEventListener: vi.fn(),
					removeEventListener: vi.fn()
				}
			]
		])

		vi.stubGlobal('useNuxtApp', () => ({ $pwa: pwa }))
		vi.stubGlobal('useLocalStorage', vi.fn(() => storage))
		vi.stubGlobal(
			'window',
			{
				addEventListener: vi.fn(),
				matchMedia: vi.fn((query: string) => mediaQueries.get(query)),
				navigator: {}
			} satisfies Partial<Window>
		)
		vi.stubGlobal(
			'document',
			{
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
				visibilityState: 'visible'
			} satisfies Partial<Document>
		)

		const installPrompt = usePwaInstallPrompt()

		await installPrompt.installApp()

		expect(pwa.install).toHaveBeenCalledTimes(1)

		installPrompt.markInstalled()
		await installPrompt.installApp()

		expect(pwa.install).toHaveBeenCalledTimes(1)
	})
})
