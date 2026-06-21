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
 * Tracks whether the current browsing context already runs as an installed PWA and exposes an
 * explicit install action for manual install UI.
 *
 * @returns Install availability state plus an explicit install action for manual UI.
 */
export function usePwaInstallPrompt() {
	const { $pwa } = useNuxtApp()
	const isStandaloneContext = shallowRef(false)
	let standaloneMediaQuery: MediaQueryList | null = null
	let fullscreenMediaQuery: MediaQueryList | null = null

	const canShowInstallPrompt = computed(() => Boolean($pwa?.showInstallPrompt) && !isStandaloneContext.value)

	function syncInstalledState() {
		if (typeof window === 'undefined') {
			return
		}

		isStandaloneContext.value = detectStandalonePwaContext(window)
	}

	async function installApp(): Promise<void> {
		if (!canShowInstallPrompt.value || !$pwa) {
			return
		}

		await $pwa.install()
	}

	function handleAppInstalled() {
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
		installApp,
		isStandaloneContext,
		syncInstalledState
	}
}
