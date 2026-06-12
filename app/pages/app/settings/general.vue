<script lang="ts" setup>
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
	<div class="space-y-12">
		<SettingsProfileSection />
		<SettingsAppSection :show-refresh="false" />
		<SettingsDataSection />
	</div>
</template>
