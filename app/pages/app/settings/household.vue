<script lang="ts" setup>
definePageMeta({ layout: 'app' })

const settingsStore = useSettingsStore()
const toast = useToast()

onMounted(async () => {
	try {
		await Promise.all([settingsStore.fetchProfile(), settingsStore.fetchHouseholds()])

		if (!settingsStore.activeHouseholdId) return

		await Promise.all([settingsStore.fetchMembers(), settingsStore.fetchSettings()])
	} catch (error) {
		toast.add({
			title:
				error && typeof error === 'object' && 'message' in error
					? String((error as { message?: string }).message)
					: 'Huishouden kon niet worden geladen.',
			color: 'error',
			icon: 'i-lucide-circle-alert'
		})
	}
})
</script>

<template>
	<PageShell>
		<template #header>
			<PageHeader>Huishouden</PageHeader>
			<SettingsNavigation />
		</template>

		<UAlert
			v-if="!settingsStore.activeHouseholdId"
			color="neutral"
			icon="i-lucide-house-x"
			title="Je zit nog niet in een huishouden"
			description="Vraag een gezinslid om je opnieuw uit te nodigen voor hun huishouden."
		/>

		<div v-else class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)]">
			<SettingsHouseholdSection />
			<SettingsAppSection :show-theme="false" />
		</div>
	</PageShell>
</template>
