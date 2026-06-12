<script setup lang="ts">
import { destroyHousehold, manageHousehold } from '#shared/utils/abilities'

const settingsStore = useSettingsStore()
const toast = useToast()
const confirm = useConfirmDialog()

const householdOptions = computed(() =>
	settingsStore.households.map((household) => ({ label: household.name, value: household.id }))
)

async function switchHousehold(householdId: string) {
	try {
		await settingsStore.switchHousehold(householdId)
		toast.add({ title: 'Huishouden gewisseld.', color: 'success', icon: 'i-lucide-check' })
	} catch (error) {
		toast.add({
			title: getErrorMessage(error, 'Huishouden kon niet worden gewisseld.'),
			color: 'error',
			icon: 'i-lucide-circle-alert'
		})
	}
}

async function createInvite() {
	try {
		const invite = await settingsStore.createInvite()
		await navigator.clipboard?.writeText(invite.url).catch(() => undefined)
		toast.add({ title: 'Uitnodigingslink gemaakt.', color: 'success', icon: 'i-lucide-link' })
	} catch (error) {
		toast.add({
			title: getErrorMessage(error, 'Uitnodigingslink kon niet worden gemaakt.'),
			color: 'error',
			icon: 'i-lucide-circle-alert'
		})
	}
}

async function createResetLink(userId: number) {
	try {
		const resetLink = await settingsStore.createResetLink(userId)
		await navigator.clipboard?.writeText(resetLink.url).catch(() => undefined)
		toast.add({ title: 'Toegangslink gemaakt.', color: 'success', icon: 'i-lucide-key-round' })
	} catch (error) {
		toast.add({
			title: getErrorMessage(error, 'Toegangslink kon niet worden gemaakt.'),
			color: 'error',
			icon: 'i-lucide-circle-alert'
		})
	}
}

async function removeMember(userId: number) {
	const ok = await confirm({
		title: 'Gezinslid verwijderen?',
		description: 'Deze gebruiker verliest toegang tot dit huishouden.',
		color: 'error'
	})

	if (!ok) return

	try {
		await settingsStore.removeMember(userId)
		toast.add({ title: 'Gezinslid verwijderd.', color: 'success', icon: 'i-lucide-check' })
	} catch (error) {
		toast.add({
			title: getErrorMessage(error, 'Gezinslid kon niet worden verwijderd.'),
			color: 'error',
			icon: 'i-lucide-circle-alert'
		})
	}
}

async function assignOwner(userId: number) {
	try {
		await settingsStore.assignOwner(userId)
		toast.add({ title: 'Eigenaar toegevoegd.', color: 'success', icon: 'i-lucide-crown' })
	} catch (error) {
		toast.add({
			title: getErrorMessage(error, 'Eigenaar kon niet worden toegevoegd.'),
			color: 'error',
			icon: 'i-lucide-circle-alert'
		})
	}
}

async function destroyCurrentHousehold() {
	const ok = await confirm({
		title: 'Huishouden verwijderen?',
		description: 'Alle lijsten, items, recepten, plannerdata en lidmaatschappen worden verwijderd. Gebruikersaccounts blijven bestaan.',
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

function getErrorMessage(error: unknown, fallback: string) {
	return error && typeof error === 'object' && 'message' in error
		? String((error as { message?: string }).message || fallback)
		: fallback
}
</script>

<template>
	<UCard>
		<template #header>
			<div class="flex items-center justify-between gap-3">
				<h2 class="text-base font-semibold">Jouw gezin</h2>
				<Can :ability="manageHousehold" :args="[settingsStore.currentMemberRole]">
					<UButton icon="i-lucide-link" size="sm" @click="createInvite">Uitnodigen</UButton>
				</Can>
			</div>
		</template>

		<div class="space-y-4">
			<UFormField v-if="settingsStore.enableMultiTenancy" label="Huishouden">
				<USelect
					:model-value="settingsStore.activeHouseholdId ?? undefined"
					:items="householdOptions"
					@update:model-value="switchHousehold(String($event))"
				/>
			</UFormField>

			<UInput v-if="settingsStore.inviteUrl" :model-value="settingsStore.inviteUrl" readonly />
			<UInput v-if="settingsStore.resetUrl" :model-value="settingsStore.resetUrl" readonly />

			<div class="divide-default divide-y">
				<div
					v-for="member in settingsStore.members"
					:key="member.id"
					class="flex items-center justify-between gap-3 py-3"
				>
					<div class="flex min-w-0 items-center gap-3">
						<UAvatar
							:src="member.avatarPathname ? `/images/${member.avatarPathname}` : undefined"
							:alt="member.name"
						/>
						<div class="min-w-0">
							<p class="truncate text-sm font-medium">{{ member.name }}</p>
							<p class="text-muted truncate text-xs">{{ member.email }}</p>
						</div>
						<UBadge v-if="member.role === 'householdOwner'" color="primary" variant="subtle">
							Eigenaar
						</UBadge>
					</div>
					<Can :ability="manageHousehold" :args="[settingsStore.currentMemberRole]">
						<div class="flex gap-1">
							<UButton
								v-if="member.role !== 'householdOwner'"
								icon="i-lucide-crown"
								color="neutral"
								variant="ghost"
								@click="assignOwner(member.id)"
							/>
							<UButton
								icon="i-lucide-key-round"
								color="neutral"
								variant="ghost"
								@click="createResetLink(member.id)"
							/>
							<UButton
								icon="i-lucide-trash-2"
								color="error"
								variant="ghost"
								@click="removeMember(member.id)"
							/>
						</div>
					</Can>
				</div>
			</div>

			<Can :ability="destroyHousehold" :args="[settingsStore.currentMemberRole]">
				<div class="border-error/30 mt-4 rounded-md border p-3">
					<p class="text-sm font-medium">Huishouden verwijderen</p>
					<p class="text-muted mt-1 text-sm">
						Alle huishouddata wordt verwijderd. Gebruikersaccounts blijven bestaan zonder
						huishouden.
					</p>
					<UButton
						class="mt-3"
						color="error"
						icon="i-lucide-trash-2"
						@click="destroyCurrentHousehold"
					>
						Huishouden verwijderen
					</UButton>
				</div>
			</Can>
		</div>
	</UCard>
</template>
