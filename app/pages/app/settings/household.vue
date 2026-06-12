<script lang="ts" setup>
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
	<div class="space-y-4">
		<SettingsHouseholdSection />
		<SettingsAppSection v-if="settingsStore.activeHouseholdId" :show-theme="false" />
	</div>
</template>
