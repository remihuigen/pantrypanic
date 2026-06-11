<script setup lang="ts">
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
	const invite = await settingsStore.createInvite()
	await navigator.clipboard?.writeText(invite.url).catch(() => undefined)
	toast.add({ title: 'Uitnodigingslink gemaakt.', color: 'success', icon: 'i-lucide-link' })
}

async function createResetLink(userId: number) {
	const resetLink = await settingsStore.createResetLink(userId)
	await navigator.clipboard?.writeText(resetLink.url).catch(() => undefined)
	toast.add({ title: 'Toegangslink gemaakt.', color: 'success', icon: 'i-lucide-key-round' })
}

async function removeMember(userId: number) {
	const ok = await confirm({
		title: 'Gezinslid verwijderen?',
		description: 'Deze gebruiker verliest toegang tot dit huishouden.',
		color: 'error'
	})

	if (!ok) return

	await settingsStore.removeMember(userId)
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
				<UButton icon="i-lucide-link" size="sm" @click="createInvite">Uitnodigen</UButton>
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
					</div>
					<div class="flex gap-1">
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
				</div>
			</div>
		</div>
	</UCard>
</template>
