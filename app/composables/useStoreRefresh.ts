import type { MaybeRefOrGetter } from 'vue'
import type { RouteLocationNormalizedLoaded } from 'vue-router'

import { useListsStore } from '~/stores/lists'
import { useMealPlannerStore } from '~/stores/meal-planner'
import { useRecipesStore } from '~/stores/recipes'
import { useSettingsStore } from '~/stores/settings'
import { computed, readonly, ref, toValue, watch } from 'vue'

type RefreshCallback = () => Promise<void> | void

type UseStoreRefreshOptions = {
	refresh: RefreshCallback
	intervalMs?: number
	enabled?: MaybeRefOrGetter<boolean>
	immediate?: boolean
	pauseWhenHidden?: boolean
}

type UseRefreshSchedulerOptions = {
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

	/**
	 * Runs the refresh callback while sharing any already active refresh promise.
	 *
	 * @returns A promise that resolves after the active refresh callback completes.
	 */
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

	/**
	 * Clears the current polling interval.
	 *
	 * @returns Nothing.
	 */
	function stopInterval() {
		if (intervalHandle) {
			clearInterval(intervalHandle)
			intervalHandle = undefined
		}
	}

	/**
	 * Starts a polling interval when client runtime and visibility state allow it.
	 *
	 * @returns Nothing.
	 */
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

	/**
	 * Enables polling and optionally performs the first refresh immediately.
	 *
	 * @returns A promise that resolves after any immediate refresh completes.
	 */
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

	/**
	 * Disables polling and clears the active interval.
	 *
	 * @returns Nothing.
	 */
	function stop() {
		isRunning.value = false
		stopInterval()
	}

	/**
	 * Pauses or resumes polling when document visibility changes.
	 *
	 * @returns Nothing.
	 */
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

/**
 * Creates the single client-wide route-aware refresh scheduler.
 *
 * @param options - Optional scheduler controls.
 * @returns Polling controls and refresh state.
 */
export function useRefreshScheduler(options: UseRefreshSchedulerOptions = {}) {
	const route = useRoute()

	return useStoreRefresh({
		enabled: options.enabled,
		immediate: options.immediate ?? false,
		pauseWhenHidden: options.pauseWhenHidden,
		refresh: async () => {
			await orchestrateRefresh(route).catch(() => undefined)
		}
	})
}

/**
 * Refreshes only the data relevant to the current app route.
 *
 * @param route - Current route.
 */
export async function orchestrateRefresh(
	route: Pick<RouteLocationNormalizedLoaded, 'path' | 'params'>
) {
	const path = normalizeRoutePath(route.path)

	if (!path.startsWith('/app')) {
		return
	}

	const settingsStore = useSettingsStore()

	if (settingsStore.profile && !settingsStore.activeHouseholdId) {
		return
	}

	if (path === '/app' || path === '/app/lists') {
		const listsStore = useListsStore()
		await Promise.all([listsStore.fetchLists('active'), listsStore.fetchSuggestions()])
		return
	}

	const listId = matchRouteParam(path, /^\/app\/lists\/([^/]+)$/)

	if (listId) {
		await useListsStore().fetchList(listId)
		return
	}

	if (path === '/app/recipes') {
		await useRecipesStore().fetchRecipes({ status: 'active' })
		return
	}

	const recipeId = matchRouteParam(path, /^\/app\/recipes\/([^/]+)$/)

	if (recipeId) {
		await useRecipesStore().fetchRecipe(recipeId)
		return
	}

	if (path === '/app/meal-planner') {
		await useMealPlannerStore().fetchMealPlanner()
		return
	}

	if (path === '/app/settings' || path === '/app/settings/general') {
		await fetchSettingsGeneral(settingsStore)
		return
	}

	if (path === '/app/settings/household') {
		await fetchSettingsHousehold(settingsStore)
		return
	}

	if (path === '/app/settings/item-vault') {
		await settingsStore.fetchHouseholds()

		if (settingsStore.activeHouseholdId) {
			await Promise.all([settingsStore.fetchItems(), settingsStore.fetchCategories()])
		}
		return
	}

	if (path === '/app/settings/categories') {
		await settingsStore.fetchHouseholds()

		if (settingsStore.activeHouseholdId) {
			await settingsStore.fetchCategories()
		}
		return
	}

	if (path === '/app/settings/stats') {
		await settingsStore.fetchHouseholds()

		if (settingsStore.activeHouseholdId) {
			await settingsStore.fetchStats()
		}
	}
}

/**
 * Resolves the default store refresh interval from Nuxt runtime config.
 *
 * @returns A positive interval in milliseconds.
 */
function resolveRefreshInterval() {
	const configuredState = useState<number | null>('pantry-refresh-interval-ms', () => null)

	if (typeof configuredState.value === 'number' && configuredState.value > 0) {
		return configuredState.value
	}

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

/**
 * Updates the client-wide default refresh interval used by store polling.
 *
 * @param intervalMs - Positive interval in milliseconds.
 */
export function setStoreRefreshInterval(intervalMs: number): void {
	const configuredState = useState<number | null>('pantry-refresh-interval-ms', () => null)

	configuredState.value = intervalMs > 0 ? intervalMs : null
}

function normalizeRoutePath(path: string) {
	const normalized = path.replace(/\/+$/, '')

	return normalized || '/'
}

function matchRouteParam(path: string, pattern: RegExp) {
	const match = path.match(pattern)
	const value = match?.[1]

	return value ? decodeURIComponent(value) : null
}

async function fetchSettingsGeneral(settingsStore: ReturnType<typeof useSettingsStore>) {
	await Promise.all([settingsStore.fetchProfile(), settingsStore.fetchHouseholds()])

	if (!settingsStore.activeHouseholdId) {
		return
	}

	await Promise.all([settingsStore.fetchMembers(), settingsStore.fetchSettings()])
}

async function fetchSettingsHousehold(settingsStore: ReturnType<typeof useSettingsStore>) {
	await Promise.all([settingsStore.fetchProfile(), settingsStore.fetchHouseholds()])

	if (!settingsStore.activeHouseholdId) {
		return
	}

	await Promise.all([settingsStore.fetchMembers(), settingsStore.fetchSettings()])
}
