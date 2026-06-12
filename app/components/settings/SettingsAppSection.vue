<script setup lang="ts">
const props = withDefaults(
	defineProps<{
		showTheme?: boolean
		showRefresh?: boolean
	}>(),
	{
		showTheme: true,
		showRefresh: true
	}
)
const settingsStore = useSettingsStore()
const toast = useToast()

const refreshIntervalSeconds = ref(5)

watch(
	() => settingsStore.householdSettings?.refreshIntervalMs,
	(value) => {
		refreshIntervalSeconds.value = Math.round((value ?? 5000) / 1000)
	},
	{ immediate: true }
)
</script>

<template>
	<UPageCard variant="subtle" title="App" description="Werk je appvoorkeuren bij.">
		<div class="space-y-4">
			<UFormField
				v-if="props.showTheme"
				label="Thema"
				description="Gebruik lichte of donkere modus"
				class="flex items-center justify-between gap-2 not-last:pb-4"
			>
				<UColorModeSwitch />
			</UFormField>
		</div>
	</UPageCard>
</template>
