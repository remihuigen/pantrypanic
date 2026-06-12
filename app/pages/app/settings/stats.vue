<script lang="ts" setup>
const settingsStore = useSettingsStore()
const toast = useToast()

onMounted(async () => {
	try {
		await settingsStore.fetchHouseholds()
		if (!settingsStore.activeHouseholdId) return
		await settingsStore.fetchStats()
	} catch (error) {
		toast.add({
			title:
				error && typeof error === 'object' && 'message' in error
					? String((error as { message?: string }).message)
					: 'Statistieken konden niet worden geladen.',
			color: 'error',
			icon: 'i-lucide-circle-alert'
		})
	}
})
</script>

<template>
	<div class="space-y-4">
		<SettingsStatsSection v-if="settingsStore.activeHouseholdId" />
	</div>
</template>
