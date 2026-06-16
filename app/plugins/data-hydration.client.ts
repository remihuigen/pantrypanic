import { useSettingsStore } from '~/stores/settings'

export default defineNuxtPlugin(() => {
	const route = useRoute()
	const settingsStore = useSettingsStore()
	const { user, fetch } = useUserSession()
	const refreshScheduler = useRefreshScheduler()

	async function startAppHydration() {
		await fetch().catch(() => undefined)

		if (!user.value) {
			refreshScheduler.stop()
			return
		}

		await Promise.allSettled([settingsStore.fetchProfile(), settingsStore.fetchHouseholds()])
		await refreshScheduler.start()
	}

	watch(
		() => route.path.startsWith('/app'),
		(isAppRoute) => {
			if (!isAppRoute) {
				refreshScheduler.stop()
				return
			}

			void startAppHydration()
		},
		{
			immediate: true
		}
	)
})
