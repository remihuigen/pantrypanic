<script setup lang="ts">
import { clearHouseholdAppData, destroyHousehold } from '#shared/utils/abilities'

const settingsStore = useSettingsStore()
const confirm = useConfirmDialog()
const toast = useToast()
const { getIcon } = useIcon()

const leaveHouseholdDestroysHousehold = computed(
	() => settingsStore.enableMultiTenancy && settingsStore.members.length <= 1
)
const leaveHouseholdDescription = computed(() =>
	leaveHouseholdDestroysHousehold.value
		? 'Je bent het laatste lid. Als je vertrekt, wordt dit huishouden met alle bijbehorende appdata verwijderd. Je account blijft bestaan.'
		: 'Je account blijft bestaan, maar je verliest toegang tot dit huishouden.'
)

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
	if (!settingsStore.enableMultiTenancy && settingsStore.members.length <= 1) {
		await confirm({
			title: 'Niet beschikbaar in single-household modus',
			description: 'Het standaardhuishouden kan in deze modus niet worden verwijderd.',
			color: 'warning'
		})
		return
	}

	if (settingsStore.isOnlyHouseholdOwner && settingsStore.members.length > 1) {
		const ok = await confirm({
			title: 'Wijs eerst een nieuwe eigenaar aan',
			description:
				'Je bent de enige eigenaar van dit huishouden. Maak eerst iemand anders eigenaar voordat je vertrekt.',
			color: 'warning'
		})

		if (ok) await navigateTo('/app/settings/household')
		return
	}

	const ok = await confirm({
		title: leaveHouseholdDestroysHousehold.value
			? 'Huishouden verlaten en verwijderen?'
			: 'Huishouden verlaten?',
		description: leaveHouseholdDescription.value,
		color: 'error'
	})

	if (!ok) return

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
	if (!settingsStore.enableMultiTenancy && settingsStore.isOnlyHouseholdOwner) {
		await confirm({
			title: 'Niet beschikbaar in single-household modus',
			description:
				'Je bent de laatste eigenaar van het standaardhuishouden. Wijs eerst een nieuwe eigenaar aan.',
			color: 'warning'
		})
		return
	}

	if (settingsStore.isOnlyHouseholdOwner && settingsStore.members.length > 1) {
		const ok = await confirm({
			title: 'Wijs eerst een nieuwe eigenaar aan',
			description:
				'Je bent de enige eigenaar van dit huishouden. Maak eerst iemand anders eigenaar voordat je je account verwijdert.',
			color: 'warning'
		})

		if (ok) await navigateTo('/app/settings/household')
		return
	}

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

async function destroyCurrentHousehold() {
	if (!settingsStore.enableMultiTenancy) {
		await confirm({
			title: 'Niet beschikbaar in single-household modus',
			description: 'Het standaardhuishouden kan in deze modus niet worden verwijderd.',
			color: 'warning'
		})
		return
	}

	const ok = await confirm({
		title: 'Huishouden verwijderen?',
		description:
			'Alle lijsten, items, recepten, plannerdata en lidmaatschappen worden verwijderd. Gebruikersaccounts blijven bestaan.',
		color: 'error'
	})

	if (!ok) return

	try {
		await settingsStore.destroyHousehold()
		toast.add({ title: 'Huishouden verwijderd.', color: 'success', icon: 'i-lucide-check' })
	} catch (error) {
		toast.add({
			title: getErrorMessage(error, 'Huishouden kon niet worden verwijderd.'),
			color: 'error',
			icon: 'i-lucide-circle-alert'
		})
	}
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
			variant="subtle"
			icon="i-lucide-house"
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
			v-if="settingsStore.activeHouseholdId && settingsStore.enableMultiTenancy"
			variant="subtle"
			color="warning"
			title="Huishouden verlaten"
			:description="leaveHouseholdDescription"
			:actions="[
				{
					label: 'Verlaat huishouden',
					icon: getIcon('leave'),
					onClick: leaveHousehold,
					color: 'warning'
				}
			]"
		/>

		<Can
			v-if="settingsStore.activeHouseholdId && settingsStore.enableMultiTenancy"
			:ability="destroyHousehold"
			:args="[settingsStore.currentMemberRole]"
		>
			<UAlert
				title="Huishouden verwijderen"
				description="Alle gegevens van dit huishouden worden verwijderd."
				variant="subtle"
				color="error"
				:actions="[
					{
						label: 'Huishouden verwijderen',
						icon: getIcon('trash'),
						onClick: destroyCurrentHousehold,
						color: 'error'
					}
				]"
			/>
		</Can>

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
