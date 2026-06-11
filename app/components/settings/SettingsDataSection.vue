<script setup lang="ts">
const settingsStore = useSettingsStore()
const confirm = useConfirmDialog()
const toast = useToast()

async function clearData() {
	const ok = await confirm({
		title: 'Alle appdata verwijderen?',
		description: 'Lijsten, items, recepten en weekplanner worden verwijderd. Gebruikers blijven bestaan.',
		color: 'error'
	})

	if (!ok) return

	await settingsStore.clearData()
	toast.add({ title: 'Appdata verwijderd.', color: 'success', icon: 'i-lucide-check' })
}
</script>

<template>
	<UCard>
		<template #header>
			<h2 class="text-base font-semibold">Data</h2>
		</template>

		<UButton color="error" icon="i-lucide-trash-2" @click="clearData">
			Alle appdata wissen
		</UButton>
	</UCard>
</template>
