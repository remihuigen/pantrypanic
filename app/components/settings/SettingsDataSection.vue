<script setup lang="ts">
import { clearHouseholdAppData } from '#shared/utils/abilities'

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

	try {
		await settingsStore.clearData()
		toast.add({ title: 'Appdata verwijderd.', color: 'success', icon: 'i-lucide-check' })
	} catch (error) {
		toast.add({
			title: getErrorMessage(error, 'Appdata kon niet worden verwijderd.'),
			color: 'error',
			icon: 'i-lucide-circle-alert'
		})
	}
}

async function leaveHousehold() {
	const ok = await confirm({
		title: 'Huishouden verlaten?',
		description: 'Je account blijft bestaan, maar je verliest toegang tot dit huishouden.',
		color: 'error'
	})

	if (!ok) return

	try {
		await settingsStore.leaveHousehold()
		toast.add({ title: 'Je hebt het huishouden verlaten.', color: 'success', icon: 'i-lucide-check' })
	} catch (error) {
		toast.add({
			title: getErrorMessage(error, 'Huishouden kon niet worden verlaten.'),
			color: 'error',
			icon: 'i-lucide-circle-alert'
		})
	}
}

async function deleteAccount() {
	const ok = await confirm({
		title: 'Account verwijderen?',
		description: 'Je account wordt verwijderd. Als je ergens de enige eigenaar bent, wijs dan eerst een nieuwe eigenaar aan.',
		color: 'error'
	})

	if (!ok) return

	try {
		await settingsStore.deleteAccount()
		await navigateTo('/login')
	} catch (error) {
		toast.add({
			title: getErrorMessage(error, 'Account kon niet worden verwijderd.'),
			color: 'error',
			icon: 'i-lucide-circle-alert'
		})
	}
}

function getErrorMessage(error: unknown, fallback: string) {
	return error && typeof error === 'object' && 'message' in error
		? String((error as { message?: string }).message || fallback)
		: fallback
}
</script>

<template>
	<UCard>
		<template #header>
			<h2 class="text-base font-semibold">Gevarenzone</h2>
		</template>

		<div class="space-y-3">
			<UAlert
				v-if="!settingsStore.activeHouseholdId"
				color="neutral"
				icon="i-lucide-house-x"
				title="Je zit nog niet in een huishouden"
				description="Vraag een gezinslid om je opnieuw uit te nodigen voor hun huishouden."
			/>

			<Can
				v-if="settingsStore.activeHouseholdId"
				:ability="clearHouseholdAppData"
				:args="[settingsStore.currentMemberRole]"
			>
				<div class="border-default rounded-md border p-3">
					<p class="text-sm font-medium">Appdata wissen</p>
					<p class="text-muted mt-1 text-sm">
						Lijsten, items, recepten en weekplanner worden verwijderd. Gebruikers blijven
						bestaan.
					</p>
					<UButton class="mt-3" color="error" icon="i-lucide-trash-2" @click="clearData">
						Alle appdata wissen
					</UButton>
				</div>
			</Can>

			<div v-if="settingsStore.activeHouseholdId" class="border-default rounded-md border p-3">
				<p class="text-sm font-medium">Huishouden verlaten</p>
				<p class="text-muted mt-1 text-sm">
					Als jij de enige eigenaar bent, wijs dan eerst een nieuwe eigenaar aan.
				</p>
				<UButton class="mt-3" color="error" variant="outline" @click="leaveHousehold">
					Huishouden verlaten
				</UButton>
			</div>

			<div class="border-error/30 rounded-md border p-3">
				<p class="text-sm font-medium">Account verwijderen</p>
				<p class="text-muted mt-1 text-sm">
					Je account wordt definitief verwijderd. Huishoudens waar jij het laatste lid bent
					worden ook verwijderd.
				</p>
				<UButton class="mt-3" color="error" icon="i-lucide-user-x" @click="deleteAccount">
					Account verwijderen
				</UButton>
			</div>
		</div>
	</UCard>
</template>
