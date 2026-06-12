<script setup lang="ts">
import { clearHouseholdAppData } from '#shared/utils/abilities'

const settingsStore = useSettingsStore()
const confirm = useConfirmDialog()
const toast = useToast()
const { getIcon } = useIcon()

async function clearData() {
	const ok = await confirm({
		title: 'Alle appdata verwijderen?',
		description:
			'Lijsten, items, recepten en weekplanner worden verwijderd. Gebruikers blijven bestaan.',
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

	// TODO check if other household owners, and if not prompt to assign a new one

	try {
		await settingsStore.leaveHousehold()
		toast.add({
			title: 'Je hebt het huishouden verlaten.',
			color: 'success',
			icon: 'i-lucide-check'
		})
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
		description:
			'Je account wordt verwijderd. Als je ergens de enige eigenaar bent, wijs dan eerst een nieuwe eigenaar aan.',
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
	<div class="space-y-4">
		<UPageCard
			title="Gevarenzone"
			description="Verwijder data, verlaat huishouden of verwijder je account."
			variant="naked"
		/>
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
			<UAlert
				variant="subtle"
				color="warning"
				title="Appdata wissen"
				description="Lijsten, items, recepten en weekplanner worden verwijderd. Gebruikers blijven bestaan."
				:actions="[
					{
						label: 'Alle appdata wissen',
						icon: getIcon('trash'),
						onClick: clearData,
						color: 'warning'
					}
				]"
			/>
		</Can>

		<UAlert
			v-if="settingsStore.activeHouseholdId"
			variant="subtle"
			color="warning"
			title="Huishouden verlaten"
			description="Je account blijft bestaan, maar je verliest toegang tot dit huishouden."
			:actions="[
				{
					label: 'Verlaat huishouden',
					icon: getIcon('leave'),
					onClick: leaveHousehold,
					color: 'warning'
				}
			]"
		/>

		<UAlert
			variant="subtle"
			color="error"
			title="Account verwijderen"
			description="Je account wordt definitief verwijderd. Huishoudens waar jij het laatste lid bent
				worden ook verwijderd."
			:actions="[
				{
					label: 'Account verwijderen',
					icon: getIcon('trash'),
					onClick: deleteAccount,
					color: 'error'
				}
			]"
		/>
	</div>
</template>
