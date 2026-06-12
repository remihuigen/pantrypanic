<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import type { RecipeItem } from '#shared/utils/schemas/domain'

import { createOccurrenceBodySchema } from '#shared/utils/schemas/domain'

type RecipeItemFormState = {
	name: string
	amount?: number
	unit?: string
	note?: string
}

const props = defineProps<{
	recipeId: string
	item?: RecipeItem | null
}>()

const isOpen = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{
	deleted: []
	saved: []
}>()

const recipesStore = useRecipesStore()
const toast = useToast()
const confirm = useConfirmDialog()
const state = reactive<RecipeItemFormState>({
	name: '',
	amount: undefined,
	unit: undefined,
	note: undefined
})

const isEditing = computed(() => Boolean(props.item))
const modalTitle = computed(() =>
	isEditing.value ? 'Ingredient wijzigen' : 'Ingredient toevoegen'
)
const modalDescription = computed(() =>
	isEditing.value
		? 'Werk de hoeveelheid, eenheid of notitie bij.'
		: 'Voeg een ingredient toe aan dit recept.'
)
const submitLabel = computed(() => (isEditing.value ? 'Opslaan' : 'Toevoegen'))
const submitIcon = computed(() => (isEditing.value ? 'i-lucide-save' : 'i-lucide-plus'))
const canSubmit = computed(() => state.name.trim().length > 0 && !recipesStore.isSaving)

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

async function submitItem(event: FormSubmitEvent<RecipeItemFormState>) {
	if (!canSubmit.value) {
		return
	}

	try {
		if (props.item) {
			await recipesStore.updateRecipeItem(props.item.id, {
				amount: event.data.amount ?? null,
				unit: normalizeNullableText(event.data.unit),
				note: normalizeNullableText(event.data.note)
			})
		} else {
			await recipesStore.addRecipeItem(props.recipeId, {
				name: event.data.name.trim(),
				amount: event.data.amount,
				unit: normalizeOptionalText(event.data.unit),
				note: normalizeOptionalText(event.data.note)
			})
		}

		isOpen.value = false
		emit('saved')
	} catch (error) {
		toast.add({
			title: getErrorMessage(
				error,
				isEditing.value
					? 'Ingredient kon niet worden bijgewerkt.'
					: 'Ingredient kon niet worden toegevoegd.'
			),
			color: 'error',
			duration: 8000,
			icon: 'i-lucide-circle-alert'
		})
	}
}

async function deleteItem() {
	if (!props.item) {
		return
	}

	const confirmed = await confirm({
		title: 'Ingredient verwijderen?',
		description: `Weet je zeker dat je "${props.item.name}" uit dit recept wilt verwijderen?`,
		color: 'error',
		actions: [
			{
				label: 'Annuleren',
				color: 'neutral',
				variant: 'soft',
				mode: 'cancel'
			},
			{
				label: 'Verwijderen',
				color: 'error',
				variant: 'solid',
				mode: 'confirm',
				icon: 'i-lucide-trash-2'
			}
		]
	})

	if (!confirmed) {
		return
	}

	try {
		await recipesStore.deleteRecipeItem(props.item.id)
		isOpen.value = false
		emit('deleted')
	} catch (error) {
		toast.add({
			title: getErrorMessage(error, 'Ingredient kon niet worden verwijderd.'),
			color: 'error',
			duration: 8000,
			icon: 'i-lucide-circle-alert'
		})
	}
}

function syncState() {
	Object.assign(state, {
		name: props.item?.name ?? '',
		amount: props.item?.amount,
		unit: props.item?.unit,
		note: props.item?.note
	})
}

function normalizeOptionalText(value: string | undefined) {
	const normalized = value?.trim()

	return normalized ? normalized : undefined
}

function normalizeNullableText(value: string | undefined) {
	const normalized = value?.trim()

	return normalized ? normalized : null
}

function getErrorMessage(error: unknown, fallback: string) {
	if (error && typeof error === 'object' && 'message' in error) {
		const message = (error as { message?: unknown }).message

		if (typeof message === 'string' && message.length > 0) {
			return message
		}
	}

	if (error instanceof Error && error.message) {
		return error.message
	}

	return fallback
}
</script>

<template>
	<UModal v-model:open="isOpen" :title="modalTitle" :description="modalDescription">
		<template #body>
			<UForm
				:schema="createOccurrenceBodySchema"
				:state="state"
				class="grid gap-4"
				@submit="submitItem"
			>
				<UFormField label="Naam" name="name" required>
					<UInput
						v-model="state.name"
						placeholder="Tomaten"
						:disabled="isEditing"
						autofocus
					/>
				</UFormField>
				<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
					<UFormField label="Aantal" name="amount">
						<UInputNumber v-model="state.amount" :min="0" />
					</UFormField>
					<UFormField label="Eenheid" name="unit">
						<UInput v-model="state.unit" placeholder="gram" />
					</UFormField>
				</div>
				<UFormField label="Notitie" name="note">
					<UTextarea v-model="state.note" placeholder="Optionele notitie" :rows="3" />
				</UFormField>
				<div class="flex flex-wrap justify-between gap-2">
					<UButton
						v-if="isEditing"
						color="error"
						variant="soft"
						icon="i-lucide-trash-2"
						square
						aria-label="Ingredient verwijderen"
						:loading="recipesStore.isSaving"
						@click="deleteItem"
					/>
					<div class="ms-auto flex gap-2">
						<UButton color="neutral" variant="soft" @click="isOpen = false">
							Annuleren
						</UButton>
						<UButton
							type="submit"
							color="primary"
							:icon="submitIcon"
							:loading="recipesStore.isSaving"
							:disabled="!canSubmit"
						>
							{{ submitLabel }}
						</UButton>
					</div>
				</div>
			</UForm>
		</template>
	</UModal>
</template>
