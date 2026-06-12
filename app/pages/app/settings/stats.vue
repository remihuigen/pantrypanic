<script lang="ts" setup>
definePageMeta({ layout: 'app' })

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
	<PageShell>
		<template #header>
			<PageHeader>Statistieken</PageHeader>
			<SettingsNavigation />
		</template>

		<UAlert
			v-if="!settingsStore.activeHouseholdId"
			color="neutral"
			icon="i-lucide-house-x"
			title="Je zit nog niet in een huishouden"
			description="Vraag een gezinslid om je opnieuw uit te nodigen voor hun huishouden."
		/>

		<SettingsStatsSection v-else />
	</PageShell>
</template>
