<script setup lang="ts">
import { manageHousehold } from '#shared/utils/abilities'

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

async function saveSettings() {
	await settingsStore.updateSettings({
		refreshIntervalMs: refreshIntervalSeconds.value * 1000
	})
	toast.add({ title: 'Instellingen opgeslagen.', color: 'success', icon: 'i-lucide-check' })
}
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
			<Can
				v-if="props.showRefresh"
				:ability="manageHousehold"
				:args="[settingsStore.currentMemberRole]"
			>
				<div class="space-y-4">
					<UFormField
						label="Verversen"
						description="Wanneer de applicatie synced met de cloud"
					>
						<UInputNumber v-model="refreshIntervalSeconds" :min="1" :max="300" />
					</UFormField>

					<UButton icon="i-lucide-save" @click="saveSettings">Opslaan</UButton>
				</div>
			</Can>
		</div>
	</UPageCard>
</template>
