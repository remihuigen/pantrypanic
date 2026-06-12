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
			<SettingsNavigation />
		</template>

		<div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)]">
			<div class="space-y-4">
				<SettingsProfileSection />
			</div>
			<div class="space-y-4">
				<SettingsAppSection :show-refresh="false" />
				<SettingsDataSection />
			</div>
		</div>
	</PageShell>
</template>
