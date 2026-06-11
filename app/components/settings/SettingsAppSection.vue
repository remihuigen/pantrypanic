<script setup lang="ts">
const settingsStore = useSettingsStore()
const colorMode = useColorMode()
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
	<UCard>
		<template #header>
			<h2 class="text-base font-semibold">App</h2>
		</template>

		<div class="space-y-4">
			<UFormField label="Thema">
				<UButtonGroup>
					<UButton
						:color="colorMode.preference === 'light' ? 'primary' : 'neutral'"
						icon="i-lucide-sun"
						@click="colorMode.preference = 'light'"
					>
						Licht
					</UButton>
					<UButton
						:color="colorMode.preference === 'dark' ? 'primary' : 'neutral'"
						icon="i-lucide-moon"
						@click="colorMode.preference = 'dark'"
					>
						Donker
					</UButton>
				</UButtonGroup>
			</UFormField>

			<UFormField label="Verversinterval">
				<UInputNumber v-model="refreshIntervalSeconds" :min="1" :max="300" />
			</UFormField>

			<UButton icon="i-lucide-save" @click="saveSettings">Opslaan</UButton>
		</div>
	</UCard>
</template>
