import type { MaybeRefOrGetter } from 'vue'

import { computed, onBeforeUnmount, readonly, ref, toValue, watch } from 'vue'

type RefreshCallback = () => Promise<void> | void

type UseStoreRefreshOptions = {
	refresh: RefreshCallback
	intervalMs?: number
	enabled?: MaybeRefOrGetter<boolean>
	immediate?: boolean
	pauseWhenHidden?: boolean
}

/**
 * Creates a polling controller for store refresh actions.
 *
 * @param options - Refresh callback and polling behavior.
 * @returns Polling controls and refresh state.
 */
export function useStoreRefresh(options: UseStoreRefreshOptions) {
	const isRunning = ref(false)
	const isRefreshing = ref(false)
	const enabled = computed(() => toValue(options.enabled) ?? true)
	const shouldPauseWhenHidden = options.pauseWhenHidden ?? true
	const shouldRunImmediately = options.immediate ?? true

	let intervalHandle: ReturnType<typeof setInterval> | undefined
	let activeRun: Promise<void> | null = null

	const refreshIntervalMs = computed(() => {
		if (typeof options.intervalMs === 'number' && options.intervalMs > 0) {
			return options.intervalMs
		}

		return resolveRefreshInterval()
	})

	async function runRefresh() {
		if (activeRun) {
			await activeRun
			return
		}

		activeRun = (async () => {
			isRefreshing.value = true

			try {
				await options.refresh()
			} finally {
				isRefreshing.value = false
				activeRun = null
			}
		})()

		await activeRun
	}

	function stopInterval() {
		if (intervalHandle) {
			clearInterval(intervalHandle)
			intervalHandle = undefined
		}
	}

	function startInterval() {
		if (!import.meta.client || !isRunning.value || !enabled.value) {
			return
		}

		stopInterval()

		if (shouldPauseWhenHidden && document.visibilityState === 'hidden') {
			return
		}

		const delay = refreshIntervalMs.value

		if (delay < 1) {
			return
		}

		intervalHandle = setInterval(() => {
			void runRefresh()
		}, delay)
	}

	async function start() {
		if (!import.meta.client || isRunning.value || !enabled.value) {
			return
		}

		isRunning.value = true

		if (shouldRunImmediately) {
			await runRefresh()
		}

		startInterval()
	}

	function stop() {
		isRunning.value = false
		stopInterval()
	}

	function handleVisibilityChange() {
		if (!isRunning.value || !shouldPauseWhenHidden) {
			return
		}

		if (document.visibilityState === 'hidden') {
			stopInterval()
			return
		}

		void runRefresh()
		startInterval()
	}

	watch(refreshIntervalMs, () => {
		if (isRunning.value) {
			startInterval()
		}
	})

	watch(enabled, (nextEnabled) => {
		if (!nextEnabled) {
			stop()
			return
		}

		void start()
	})

	if (import.meta.client && shouldPauseWhenHidden) {
		document.addEventListener('visibilitychange', handleVisibilityChange)
	}

	return {
		isRunning: readonly(isRunning),
		isRefreshing: readonly(isRefreshing),
		start,
		stop,
		refreshNow: runRefresh
	}
}

function resolveRefreshInterval() {
	try {
		const runtimeConfig = useRuntimeConfig()
		const configured = Number(runtimeConfig.public.refreshInterval)

		if (Number.isFinite(configured) && configured > 0) {
			return configured
		}
	} catch {
		// Fallback value for tests or non-Nuxt contexts.
	}

	return 5000
}
