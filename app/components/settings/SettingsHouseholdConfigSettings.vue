<script setup lang="ts">
import { manageHousehold } from '#shared/utils/abilities'
import { getIcon } from '#shared/utils/icons'

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
const initialRefreshIntervalSeconds = shallowRef(refreshIntervalSeconds.value)
const { isDirty: isRefreshIntervalDirty, resetInitialValue: resetInitialRefreshInterval } =
	useFormState(initialRefreshIntervalSeconds, refreshIntervalSeconds)

watch(
	() => settingsStore.householdSettings?.refreshIntervalMs,
	(value) => {
		refreshIntervalSeconds.value = Math.round((value ?? 5000) / 1000)
		initialRefreshIntervalSeconds.value = refreshIntervalSeconds.value
		resetInitialRefreshInterval(initialRefreshIntervalSeconds)
	},
	{ immediate: true }
)

async function saveSettings() {
	if (!isRefreshIntervalDirty.value) return

	await settingsStore.updateSettings({
		refreshIntervalMs: refreshIntervalSeconds.value * 1000
	})
	toast.add({ title: 'Instellingen opgeslagen.', color: 'success', icon: getIcon('check') })
}
</script>

<template>
	<Can
		v-if="props.showRefresh"
		:ability="manageHousehold"
		:args="[settingsStore.currentMemberRole]"
	>
		<UPageCard variant="subtle" title="App" description="Werk je appvoorkeuren bij.">
			<div class="space-y-4">
				<div class="space-y-4">
					<UFormField
						label="Verversen"
						description="Wanneer de applicatie synced met de cloud"
					>
						<UInputNumber v-model="refreshIntervalSeconds" :min="1" :max="300" />
					</UFormField>

					<UButton
						:icon="getIcon('save')"
						:disabled="!isRefreshIntervalDirty"
						@click="saveSettings"
					>
						Opslaan
					</UButton>
				</div>
			</div>
		</UPageCard>
	</Can>
</template>
