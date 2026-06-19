const PWA_INSTALLED_STORAGE_KEY = 'pantrypanic:pwa-installed'

type NavigatorWithStandalone = Navigator & {
	standalone?: boolean
}

/**
 * Detects whether the current browsing context already runs as an installed PWA.
 *
 * @param win - Window-like object used to query display mode and iOS standalone state.
 * @returns Whether the current context is already standalone/fullscreen.
 */
export function detectStandalonePwaContext(
	win: Pick<Window, 'matchMedia' | 'navigator'>
): boolean {
	return (
		win.matchMedia('(display-mode: standalone)').matches ||
		win.matchMedia('(display-mode: fullscreen)').matches ||
		(win.navigator as NavigatorWithStandalone).standalone === true
	)
}

/**
 * Tracks whether the current browser profile has already installed or launched the app and derives
 * whether the custom install prompt should still be shown in browser tabs.
 *
 * @returns Prompt visibility state plus install/dismiss helpers for the app shell.
 */
export function usePwaInstallPrompt() {
	const { $pwa } = useNuxtApp()
	const hasInstalledApp = useLocalStorage<boolean>(PWA_INSTALLED_STORAGE_KEY, false)
	const isStandaloneContext = shallowRef(false)
	let standaloneMediaQuery: MediaQueryList | null = null
	let fullscreenMediaQuery: MediaQueryList | null = null

	const canShowInstallPrompt = computed(
		() => Boolean($pwa?.showInstallPrompt) && !hasInstalledApp.value && !isStandaloneContext.value
	)

	function syncInstalledState() {
		if (typeof window === 'undefined') {
			return
		}

		const isStandalone = detectStandalonePwaContext(window)

		isStandaloneContext.value = isStandalone

		if (isStandalone) {
			hasInstalledApp.value = true
		}
	}

	function markInstalled() {
		hasInstalledApp.value = true
	}

	async function installApp(): Promise<void> {
		if (!canShowInstallPrompt.value || !$pwa) {
			return
		}

		await $pwa.install()
	}

	function dismissInstallPrompt(): void {
		$pwa?.cancelInstall()
	}

	function handleAppInstalled() {
		markInstalled()
		syncInstalledState()
	}

	function handleVisibilityChange() {
		if (document.visibilityState !== 'visible') {
			return
		}

		syncInstalledState()
	}

	onMounted(() => {
		syncInstalledState()

		window.addEventListener('appinstalled', handleAppInstalled)
		document.addEventListener('visibilitychange', handleVisibilityChange)
		standaloneMediaQuery = window.matchMedia('(display-mode: standalone)')
		fullscreenMediaQuery = window.matchMedia('(display-mode: fullscreen)')
		standaloneMediaQuery.addEventListener('change', syncInstalledState)
		fullscreenMediaQuery.addEventListener('change', syncInstalledState)
	})

	onUnmounted(() => {
		if (typeof window === 'undefined') {
			return
		}

		window.removeEventListener('appinstalled', handleAppInstalled)
		document.removeEventListener('visibilitychange', handleVisibilityChange)
		standaloneMediaQuery?.removeEventListener('change', syncInstalledState)
		fullscreenMediaQuery?.removeEventListener('change', syncInstalledState)
	})

	return {
		canShowInstallPrompt,
		dismissInstallPrompt,
		hasInstalledApp,
		installApp,
		isStandaloneContext,
		markInstalled,
		syncInstalledState
	}
}
