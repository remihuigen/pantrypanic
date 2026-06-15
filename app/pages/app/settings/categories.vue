<script setup lang="ts">
definePageMeta({ layout: 'app' })

const settingsStore = useSettingsStore()

onMounted(async () => {
	if (settingsStore.activeHouseholdId) {
		await settingsStore.fetchCategories()
	}
})
</script>

<template>
	<div class="space-y-4">
		<SettingsCategoriesSection v-if="settingsStore.activeHouseholdId" />
	</div>
</template>
