<script lang="ts" setup>
import type { FormSubmitEvent } from '@nuxt/ui'
import type { EditListDrawerMode, EditListDrawerSubmitData } from '~/composables/useEditListDrawer'

import { createListBodySchema } from '#shared/utils/schemas/domain'
import { useEditListDrawer, useEditListDrawerForm } from '~/composables/useEditListDrawer'
import { z } from 'zod'

const props = defineProps<{
	mode: EditListDrawerMode
	listId?: string | null
}>()

const editListDrawer = useEditListDrawer()
const editListDrawerFormId = 'edit-list-drawer-form'
const { getIcon } = useIcon()
const { formState, isSubmitting, canSubmit, submitForm, closeAndReset } = useEditListDrawerForm({
	drawer: editListDrawer,
	listId: props.listId,
	mode: props.mode
})

const drawerTitle = computed(() =>
	props.mode === 'edit' ? 'Lijstinstellingen wijzigen' : 'Lijst toevoegen'
)
const drawerDescription = computed(() =>
	props.mode === 'edit'
		? 'Pas de naam en het icoon van deze lijst aan.'
		: 'Maak een nieuwe boodschappenlijst.'
)
const submitLabel = computed(() => (props.mode === 'edit' ? 'Opslaan' : 'Toevoegen'))
const submitIcon = computed(() => (props.mode === 'edit' ? 'i-lucide-save' : getIcon('plus')))

const editListFormSchema = z.preprocess(normalizeIconValueForSchema, createListBodySchema)

type EditListFormSchema = z.output<typeof createListBodySchema>

function normalizeIconValueForSchema(value: unknown) {
	if (!value || typeof value !== 'object' || !('icon' in value)) {
		return value
	}

	const nextValue = value as { icon?: unknown }

	if (typeof nextValue.icon !== 'string' || nextValue.icon.trim().length > 0) {
		return value
	}

	return {
		...nextValue,
		icon: undefined
	}
}

function handleSubmit(payload: FormSubmitEvent<EditListFormSchema>) {
	return submitForm({ data: payload.data as EditListDrawerSubmitData })
}
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
				:schema="editListFormSchema"
				:state="formState"
				class="grid space-y-4"
				:validate-on="['blur']"
				@submit="handleSubmit"
			>
				<UFormField name="name" size="xl" required>
					<UInput
						v-model="formState.name"
						placeholder="Bijvoorbeeld weekendboodschappen"
						:icon="getIcon('list')"
						:disabled="isSubmitting"
						autofocus
						:ui="{ leadingIcon: 'size-4' }"
					/>
				</UFormField>

				<UFormField name="icon" size="lg">
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
