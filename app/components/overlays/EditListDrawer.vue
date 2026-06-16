<script lang="ts" setup>
import type { FormSubmitEvent } from '@nuxt/ui'
import type { EditListDrawerSubmitData } from '~/composables/useEditListDrawer'
import type { z } from 'zod'

import { createListBodySchema } from '#shared/utils/schemas/domain'
import { useEditListDrawer, useEditListDrawerForm } from '~/composables/useEditListDrawer'
import { ref, watch } from 'vue'

const editListDrawer = useEditListDrawer()
const editListDrawerFormId = 'edit-list-drawer-form'
const { getIcon } = useIcon()
const { formState, isSubmitting, canSubmit, submitForm, closeAndReset } = useEditListDrawerForm({
	drawer: editListDrawer
})

const drawerTitle = computed(() =>
	editListDrawer.mode.value === 'edit' ? 'Lijstinstellingen wijzigen' : 'Lijst toevoegen'
)
const drawerDescription = computed(() =>
	editListDrawer.mode.value === 'edit'
		? 'Pas de naam en het icoon van deze lijst aan.'
		: 'Maak een nieuwe boodschappenlijst.'
)
const submitLabel = computed(() => (editListDrawer.mode.value === 'edit' ? 'Opslaan' : 'Toevoegen'))
const submitIcon = computed(() =>
	editListDrawer.mode.value === 'edit' ? 'i-lucide-save' : getIcon('plus')
)

type EditListFormSchema = z.output<typeof createListBodySchema>

function handleSubmit(payload: FormSubmitEvent<EditListFormSchema>) {
	return submitForm({ data: payload.data as EditListDrawerSubmitData })
}

const exampleLists = [
	'Weekendboodschappen',
	'Weekmenu',
	'Voorraadkast',
	'Lunchpakketjes',
	'Borrelavond',
	'Barbecue',
	'Feestdagen',
	'Receptenlijst',
	'Favorieten',
	'Snelle boodschappen'
]

const currentExample = ref('Weekendboodschappen')

function randomlySelectExample() {
	currentExample.value = selectRandomExample(exampleLists, currentExample.value)
}

function selectRandomExample(examples: readonly string[], current: string) {
	const nextExamples = examples.filter((example) => example !== current)
	const selectableExamples = nextExamples.length > 0 ? nextExamples : examples
	const randomIndex = Math.floor(Math.random() * selectableExamples.length)

	return selectableExamples[randomIndex] ?? current
}

watch(
	() => editListDrawer.isOpen.value,
	(isOpen) => {
		if (isOpen && editListDrawer.mode.value === 'create') {
			randomlySelectExample()
		}
	}
)
</script>

<template>
	<UDrawer
		v-model:open="editListDrawer.isOpen.value"
		:title="drawerTitle"
		:description="drawerDescription"
		handle
	>
		<template #body>
			<UForm
				:id="editListDrawerFormId"
				:schema="createListBodySchema"
				:state="formState"
				class="grid space-y-4"
				:validate-on="[]"
				@submit="handleSubmit"
			>
				<UFormField name="name" size="xl" required>
					<UInput
						v-model="formState.name"
						:placeholder="`Bijvoorbeeld ${currentExample.toLowerCase()}`"
						:icon="getIcon('list')"
						:disabled="isSubmitting"
						:autofocus="editListDrawer.mode.value === 'create'"
						:ui="{ leadingIcon: 'size-4' }"
					/>
				</UFormField>

				<UFormField name="icon" size="xl">
					<IconPicker v-model="formState.icon" :disabled="isSubmitting" />
				</UFormField>
			</UForm>
		</template>

		<template #footer>
			<div class="flex w-full items-center justify-end gap-2 p-4">
				<UButton
					variant="ghost"
					color="neutral"
					:disabled="isSubmitting"
					@click="closeAndReset"
				>
					Annuleren
				</UButton>
				<UButton
					color="primary"
					type="submit"
					:form="editListDrawerFormId"
					:loading="isSubmitting"
					:disabled="!canSubmit"
					:trailing-icon="submitIcon"
				>
					{{ submitLabel }}
				</UButton>
			</div>
		</template>
	</UDrawer>
</template>
