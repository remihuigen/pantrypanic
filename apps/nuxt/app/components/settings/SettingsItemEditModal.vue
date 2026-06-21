<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'

import { getIcon } from '#shared/utils/icons'
import { domainIdSchema } from '#shared/utils/schemas/domain'
import { z } from 'zod'

type SettingsItemEditTarget = {
	id: string
	name: string
	defaultUnit?: string
	categoryId?: string
}

type CategoryOption = {
	label: string
	value: string
}

type SettingsItemEditFormState = {
	name: string
	defaultUnit: string
	categoryId: string
}

type NormalizedSettingsItemEditFormState = {
	name: string
	defaultUnit: string | null
	categoryId: string | null
}

const props = defineProps<{
	item?: SettingsItemEditTarget | null
	categoryOptions: CategoryOption[]
	isSaving?: boolean
}>()

const isOpen = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{
	save: [
		payload: {
			itemId: string
			input: {
				name: string
				defaultUnit: string | null
				categoryId: string | null
			}
		}
	]
}>()

const itemEditFormSchema = z.strictObject({
	name: z
		.string({ error: 'Naam is verplicht.' })
		.trim()
		.min(1, { error: 'Naam is verplicht.' })
		.max(120, { error: 'Naam mag maximaal 120 tekens bevatten.' }),
	defaultUnit: z
		.string({ error: 'Eenheid moet tekst zijn.' })
		.trim()
		.max(40, { error: 'Eenheid mag maximaal 40 tekens bevatten.' })
		.optional(),
	categoryId: z.union([domainIdSchema, z.literal('')]).optional()
})

type SettingsItemEditFormData = z.output<typeof itemEditFormSchema>

const state = reactive<SettingsItemEditFormState>({
	name: '',
	defaultUnit: '',
	categoryId: ''
})
const initialFormValue = shallowRef<NormalizedSettingsItemEditFormState>(normalizeFormValue(state))
const currentFormValue = computed(() => normalizeFormValue(state))
const { isDirty, resetInitialValue } = useFormState(initialFormValue, currentFormValue)

const canSubmit = computed(
	() =>
		Boolean(props.item?.id) && state.name.trim().length > 0 && isDirty.value && !props.isSaving
)

watch(
	() => [isOpen.value, props.item?.id] as const,
	([open]) => {
		if (!open) {
			return
		}

		syncState()
	},
	{ immediate: true }
)

async function submitItem(event: FormSubmitEvent<SettingsItemEditFormData>) {
	if (!props.item?.id || !canSubmit.value) {
		return
	}

	emit('save', {
		itemId: props.item.id,
		input: {
			name: event.data.name.trim(),
			defaultUnit: normalizeNullableText(event.data.defaultUnit),
			categoryId: normalizeNullableText(event.data.categoryId)
		}
	})
}

function syncState() {
	Object.assign(state, {
		name: props.item?.name ?? '',
		defaultUnit: props.item?.defaultUnit ?? '',
		categoryId: props.item?.categoryId ?? ''
	})
	initialFormValue.value = normalizeFormValue(state)
	resetInitialValue(initialFormValue)
}

function normalizeNullableText(value: string | undefined) {
	const normalized = value?.trim()

	return normalized ? normalized : null
}

function normalizeFormValue(value: SettingsItemEditFormState): NormalizedSettingsItemEditFormState {
	return {
		name: value.name.trim(),
		defaultUnit: normalizeNullableText(value.defaultUnit),
		categoryId: normalizeNullableText(value.categoryId)
	}
}
</script>

<template>
	<UModal
		v-model:open="isOpen"
		title="Item wijzigen"
		description="Werk de itemnaam, standaard eenheid of categorie bij."
	>
		<template #body>
			<UForm
				:schema="itemEditFormSchema"
				:state="state"
				class="grid gap-4"
				@submit="submitItem"
			>
				<UFormField label="Naam" name="name" required size="xl">
					<UInput v-model="state.name" placeholder="Halfvolle melk" autofocus />
				</UFormField>

				<UFormField label="Standaard eenheid" name="defaultUnit" size="xl">
					<UInput v-model="state.defaultUnit" placeholder="pak" />
				</UFormField>

				<UFormField label="Categorie" name="categoryId" size="xl">
					<USelectMenu
						v-model="state.categoryId"
						:items="props.categoryOptions"
						value-key="value"
						label-key="label"
						placeholder="Categorie"
						:icon="getIcon('tags')"
						clearable
					/>
				</UFormField>

				<div class="flex justify-end gap-2">
					<UButton
						color="neutral"
						variant="soft"
						:disabled="props.isSaving"
						@click="isOpen = false"
					>
						Annuleren
					</UButton>
					<UButton
						type="submit"
						color="primary"
						:icon="getIcon('save')"
						:loading="props.isSaving"
						:disabled="!canSubmit"
					>
						Opslaan
					</UButton>
				</div>
			</UForm>
		</template>
	</UModal>
</template>
