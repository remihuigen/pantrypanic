<script lang="ts" setup>
const settingsStore = useSettingsStore()
const toast = useToast()

onMounted(async () => {
	try {
		await settingsStore.fetchHouseholds()
		if (!settingsStore.activeHouseholdId) return
		await Promise.all([settingsStore.fetchItems(), settingsStore.fetchCategories()])
	} catch (error) {
		toast.add({
			title:
				error && typeof error === 'object' && 'message' in error
					? String((error as { message?: string }).message)
					: 'Items konden niet worden geladen.',
			color: 'error',
			icon: 'i-lucide-circle-alert'
		})
	}
})
</script>

<template>
	<div class="space-y-4">
		<SettingsItemsSection v-if="settingsStore.activeHouseholdId" />
	</div>
</template>
