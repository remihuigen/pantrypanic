<script lang="ts" setup>
definePageMeta({ layout: 'app' })

const settingsStore = useSettingsStore()
const toast = useToast()

onMounted(async () => {
	try {
		await settingsStore.fetchAll()
	} catch (error) {
		toast.add({
			title:
				error && typeof error === 'object' && 'message' in error
					? String((error as { message?: string }).message)
					: 'Instellingen konden niet worden geladen.',
			color: 'error',
			icon: 'i-lucide-circle-alert'
		})
	}
})
</script>

<template>
	<PageShell>
		<template #header>
			<PageHeader>Instellingen</PageHeader>
		</template>

		<div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)]">
			<div class="space-y-4">
				<SettingsProfileSection />
				<SettingsHouseholdSection />
				<SettingsItemsSection />
			</div>
			<div class="space-y-4">
				<SettingsAppSection />
				<SettingsStatsSection />
				<SettingsDataSection />
			</div>
		</div>
	</PageShell>
</template>
