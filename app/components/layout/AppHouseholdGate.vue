<script setup lang="ts">
import { getIcon } from '#shared/utils/icons'

const settingsStore = useSettingsStore()
const confirm = useConfirmDialog()
const toast = useToast()
const showCreateHousehold = ref(false)

async function deleteAccount() {
	const ok = await confirm({
		title: 'Account verwijderen?',
		description:
			'Je account wordt definitief verwijderd. Dit kun je niet ongedaan maken.',
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
			icon: getIcon('error')
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
	<div class="flex flex-1 items-center justify-center py-12">
		<UPageCard
			title="Je zit nog niet in een huishouden"
			description="Vraag een gezinslid om je uit te nodigen voor hun huishouden. Zodra je een uitnodigingslink opent, krijg je direct weer toegang tot de app."
			variant="subtle"
			class="w-full max-w-2xl"
			:ui="{ body: 'space-y-4' }"
		>
			<div class="flex flex-wrap gap-2">
				<UButton
					v-if="settingsStore.enableHouseholdCreation"
					:icon="getIcon('plus')"
					@click="showCreateHousehold = true"
				>
					Nieuw huishouden maken
				</UButton>
				<UButton
					:icon="getIcon('trash')"
					color="error"
					variant="outline"
					@click="deleteAccount"
				>
					Account verwijderen
				</UButton>
			</div>
		</UPageCard>

		<SettingsCreateHouseholdModal v-model:open="showCreateHousehold" />
	</div>
</template>
