<script setup lang="ts">
import { getIcon } from '#shared/utils/icons'

const open = defineModel<boolean>('open', { default: false })

const settingsStore = useSettingsStore()
const toast = useToast()
const name = ref('')
const isCreating = ref(false)

async function createHousehold() {
	const householdName = name.value.trim()

	if (!householdName) return

	isCreating.value = true
	try {
		await settingsStore.createHousehold({ name: householdName })
		name.value = ''
		open.value = false
		toast.add({ title: 'Huishouden aangemaakt.', color: 'success', icon: getIcon('check') })
	} catch (error) {
		toast.add({
			title: getErrorMessage(error, 'Huishouden kon niet worden aangemaakt.'),
			color: 'error',
			icon: getIcon('error')
		})
	} finally {
		isCreating.value = false
	}
}

function getErrorMessage(error: unknown, fallback: string) {
	return error && typeof error === 'object' && 'message' in error
		? String((error as { message?: string }).message || fallback)
		: fallback
}
</script>

<template>
	<UModal
		v-model:open="open"
		title="Nieuw huishouden"
		description="Maak een apart huishouden aan met eigen lijsten, recepten en planning."
	>
		<template #body>
			<UFormField label="Naam">
				<UInput
					v-model="name"
					placeholder="Naam van het huishouden"
					autofocus
					@keydown.enter.prevent="createHousehold"
				/>
			</UFormField>
		</template>

		<template #footer>
			<div class="flex w-full justify-end gap-2">
				<UButton
					color="neutral"
					variant="ghost"
					:disabled="isCreating"
					@click="open = false"
				>
					Annuleren
				</UButton>
				<UButton
					:icon="getIcon('plus')"
					:disabled="!name.trim()"
					:loading="isCreating"
					@click="createHousehold"
				>
					Aanmaken
				</UButton>
			</div>
		</template>
	</UModal>
</template>
