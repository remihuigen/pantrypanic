import { useSettingsStore } from '~/stores/settings'

export default defineNuxtPlugin(async () => {
	const settingsStore = useSettingsStore()
	const { user, fetch } = useUserSession()

	await fetch().catch(() => undefined)

	if (!user.value) {
		return
	}

	await Promise.allSettled([
		settingsStore.fetchProfile(),
		settingsStore.fetchHouseholds()
	])

	await useRefreshScheduler().start()
})
