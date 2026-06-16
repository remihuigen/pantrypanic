<script setup lang="ts">
import { useClipboard } from '@vueuse/core'
import { manageHousehold } from '#shared/utils/abilities'

const settingsStore = useSettingsStore()
const toast = useToast()
const confirm = useConfirmDialog()
const { getIcon } = useIcon()
const createHouseholdValue = '__create_household__'

const householdOptions = computed(() => [
	...settingsStore.households.map((household) => ({
		label: household.name,
		value: household.id
	})),
	...(settingsStore.enableHouseholdCreation
		? [{ label: '+ nieuw huishouden maken', value: createHouseholdValue }]
		: [])
])
const showCreateHousehold = ref(false)

const inviteLink = ref('')
const resetLink = ref('')
const { copy: copyInvite } = useClipboard({ source: inviteLink })
const { copy: copyReset } = useClipboard({ source: resetLink })

function handleCopyInvite() {
	copyInvite()
	toast.add({ title: 'Uitnodigingslink gekopieerd.', color: 'success', icon: 'i-lucide-check' })
}

function handleCopyReset() {
	copyReset()
	toast.add({ title: 'Toegangslink gekopieerd.', color: 'success', icon: 'i-lucide-check' })
}

async function switchHousehold(householdId: string) {
	if (householdId === createHouseholdValue) {
		showCreateHousehold.value = true
		return
	}

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
		const { url } = await settingsStore.createInvite()
		inviteLink.value = url
		copyInvite()
		// await navigator.clipboard?.writeText(url).catch(() => undefined)
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
		const { url } = await settingsStore.createResetLink(userId)
		resetLink.value = url
		copyReset()
		// await navigator.clipboard?.writeText(url).catch(() => undefined)
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
	if (isOnlyHouseholdOwner(userId)) {
		await confirm({
			title: 'Wijs eerst een nieuwe eigenaar aan',
			description:
				'Dit gezinslid is de enige eigenaar van het huishouden. Maak eerst iemand anders eigenaar.',
			color: 'warning'
		})
		return
	}

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

function getErrorMessage(error: unknown, fallback: string) {
	return error && typeof error === 'object' && 'message' in error
		? String((error as { message?: string }).message || fallback)
		: fallback
}

function imageUrl(pathname: string) {
	return `/images/${pathname.replace(/^\/+/, '')}`
}

function isOnlyHouseholdOwner(userId: number) {
	const member = settingsStore.members.find((entry) => entry.id === userId)

	return (
		member?.role === 'householdOwner' &&
		settingsStore.members.filter((entry) => entry.role === 'householdOwner').length === 1
	)
}
</script>

<template>
	<div class="space-y-4">
		<UPageCard
			title="Jouw gezin"
			description="Beheer je huishouden en de bijbehorende leden."
			variant="naked"
			orientation="horizontal"
		>
			<Can :ability="manageHousehold" :args="[settingsStore.currentMemberRole]">
				<UButton
					icon="i-lucide-link"
					size="sm"
					class="w-fit lg:ms-auto"
					@click="createInvite"
					>Uitnodigen</UButton
				>
			</Can>
		</UPageCard>
		<UPageCard variant="subtle" :ui="{ body: 'space-y-4' }">
			<UFormField
				v-if="settingsStore.inviteUrl"
				label="Uitnodigingslink"
				description="Deel deze link met met een familielid"
			>
				<UInput :model-value="settingsStore.inviteUrl" readonly disabled class="opacity-60">
					<UButton
						color="neutral"
						variant="subtle"
						:icon="getIcon('copy')"
						class="absolute top-1/2 right-1 -translate-y-1/2"
						size="xs"
						@click="handleCopyInvite"
					/>
				</UInput>
			</UFormField>

			<UFormField
				v-if="settingsStore.enableMultiTenancy || settingsStore.enableHouseholdCreation"
				label="Huishouden"
				size="xl"
			>
				<USelect
					:model-value="settingsStore.activeHouseholdId ?? undefined"
					:items="householdOptions"
					@update:model-value="switchHousehold(String($event))"
				/>
			</UFormField>

			<UButton
				v-if="settingsStore.enableHouseholdCreation && !settingsStore.activeHouseholdId"
				icon="i-lucide-plus"
				color="neutral"
				variant="outline"
				class="w-fit"
				@click="showCreateHousehold = true"
			>
				Nieuw huishouden maken
			</UButton>

			<div v-if="settingsStore.activeHouseholdId" class="divide-default divide-y">
				<div v-for="member in settingsStore.members" :key="member.id" class="space-y-3">
					<div class="flex items-center justify-between gap-3 py-3">
						<div class="flex min-w-0 grow items-center justify-between gap-3">
							<UUser
								:avatar="{
									src: member.avatarPathname
										? imageUrl(member.avatarPathname)
										: undefined
								}"
								:name="member.name"
								:description="member.email"
							/>
							<UBadge
								v-if="member.role === 'householdOwner'"
								color="secondary"
								variant="subtle"
								size="sm"
							>
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
					<UFormField
						v-if="settingsStore.resetUrl"
						label="Toegangslink"
						description="Deel deze link met met het familielid dat je opnieuw toegang wilt geven"
					>
						<UInput
							:model-value="settingsStore.resetUrl"
							readonly
							disabled
							class="opacity-60"
						>
							<UButton
								color="neutral"
								variant="subtle"
								:icon="getIcon('copy')"
								class="absolute top-1/2 right-1 -translate-y-1/2"
								size="xs"
								@click="handleCopyReset"
							/>
						</UInput>
					</UFormField>
				</div>
			</div>
		</UPageCard>

		<SettingsCreateHouseholdModal v-model:open="showCreateHousehold" />
	</div>
</template>
