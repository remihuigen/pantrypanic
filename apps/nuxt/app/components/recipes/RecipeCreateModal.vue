<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import type { CreateRecipeInput, UpdateRecipeInput } from '#shared/utils/schemas/domain'
import { getIcon } from '#shared/utils/icons'

import { createRecipeBodySchema } from '#shared/utils/schemas/domain'
import { z } from 'zod'

type RecipeFormState = Omit<CreateRecipeInput, 'items'> & {
	items: []
}

type NormalizedRecipeFormState = {
	name: string
	description: string | null
	servings: number | null
	sourceUrl: string | null
}

const props = defineProps<{
	recipeId?: string
}>()

const isOpen = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{
	created: [recipeId: string]
	updated: [recipeId: string]
}>()

const recipesStore = useRecipesStore()
const toast = useToast()
const recipeFormSchema = createRecipeBodySchema.extend({
	sourceUrl: z
		.union([z.literal(''), z.url({ error: 'Bron moet een geldige URL zijn.' })])
		.optional()
})
type RecipeFormData = z.output<typeof recipeFormSchema>
const state = reactive<RecipeFormState>({
	name: '',
	description: undefined,
	servings: undefined,
	sourceUrl: undefined,
	items: []
})
const initialFormValue = shallowRef<NormalizedRecipeFormState>(normalizeRecipeFormValue(state))

const isEditing = computed(() => Boolean(props.recipeId))
const modalTitle = computed(() => (isEditing.value ? 'Recept wijzigen' : 'Nieuw recept'))
const modalDescription = computed(() =>
	isEditing.value ? 'Werk de receptinstellingen bij.' : 'Maak een recept aan.'
)
const submitLabel = computed(() => (isEditing.value ? 'Opslaan' : 'Aanmaken'))
const submitIcon = computed(() => (isEditing.value ? getIcon('save') : getIcon('plus')))
const currentFormValue = computed(() => normalizeRecipeFormValue(state))
const { isDirty, resetInitialValue } = useFormState(initialFormValue, currentFormValue)
const canSubmit = computed(
	() =>
		state.name.trim().length > 0 &&
		(!isEditing.value || isDirty.value) &&
		!recipesStore.isSaving
)

watch(
	() => [isOpen.value, props.recipeId] as const,
	([open]) => {
		if (!open) {
			return
		}

		syncState()
	},
	{ immediate: true }
)

async function submitRecipe(event: FormSubmitEvent<RecipeFormData>) {
	if (!canSubmit.value) {
		return
	}

	try {
		if (props.recipeId) {
			await updateRecipe(props.recipeId, event.data)
			isOpen.value = false
			emit('updated', props.recipeId)
			return
		}

		const recipe = await createRecipe(event.data)

		resetState()
		isOpen.value = false
		emit('created', recipe.id)
	} catch (error) {
		toast.add({
			title: getErrorMessage(
				error,
				isEditing.value
					? 'Recept kon niet worden bijgewerkt.'
					: 'Recept kon niet worden aangemaakt.'
			),
			color: 'error',
			duration: 8000,
			icon: getIcon('error')
		})
	}
}

async function createRecipe(data: RecipeFormData) {
	return await recipesStore.createRecipe({
		name: data.name.trim(),
		description: normalizeOptionalText(data.description),
		servings: data.servings,
		sourceUrl: normalizeOptionalText(data.sourceUrl),
		items: []
	})
}

async function updateRecipe(recipeId: string, data: RecipeFormData) {
	const input: UpdateRecipeInput = {
		name: data.name.trim(),
		description: normalizeNullableText(data.description),
		servings: data.servings ?? null,
		sourceUrl: normalizeNullableText(data.sourceUrl)
	}

	await recipesStore.updateRecipe(recipeId, input)
	await recipesStore.fetchRecipe(recipeId).catch(() => undefined)
}

function syncState() {
	if (!props.recipeId) {
		resetState()
		return
	}

	const recipe = recipesStore.recipesById[props.recipeId]

	Object.assign(state, {
		name: recipe?.name ?? '',
		description: recipe?.description,
		servings: recipe?.servings,
		sourceUrl: recipe?.sourceUrl,
		items: []
	})
	initialFormValue.value = normalizeRecipeFormValue(state)
	resetInitialValue(initialFormValue)
}

function resetState() {
	Object.assign(state, {
		name: '',
		description: undefined,
		servings: undefined,
		sourceUrl: undefined,
		items: []
	})
	initialFormValue.value = normalizeRecipeFormValue(state)
	resetInitialValue(initialFormValue)
}

function normalizeOptionalText(value: string | undefined) {
	const normalized = value?.trim()

	return normalized ? normalized : undefined
}

function normalizeNullableText(value: string | undefined) {
	const normalized = value?.trim()

	return normalized ? normalized : null
}

function normalizeRecipeFormValue(value: RecipeFormState): NormalizedRecipeFormState {
	return {
		name: value.name.trim(),
		description: normalizeNullableText(value.description),
		servings: value.servings ?? null,
		sourceUrl: normalizeNullableText(value.sourceUrl)
	}
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
				:schema="recipeFormSchema"
				:state="state"
				class="grid gap-4"
				@submit="submitRecipe"
			>
				<UFormField label="Naam" name="name" required size="xl">
					<UInput
						v-model="state.name"
						placeholder="Pasta pesto"
						:autofocus="!isEditing"
					/>
				</UFormField>
				<UFormField label="Beschrijving" name="description" size="xl">
					<UTextarea
						v-model="state.description"
						placeholder="Korte notitie voor de receptenlijst"
						:rows="3"
					/>
				</UFormField>
				<div class="grid grid-cols-1 gap-3 sm:grid-cols-[120px_1fr]">
					<UFormField label="Porties" name="servings" size="xl">
						<UInputNumber v-model="state.servings" :min="1" />
					</UFormField>
					<UFormField label="Bron" name="sourceUrl" size="xl">
						<UInput
							v-model="state.sourceUrl"
							type="url"
							placeholder="https://..."
							:icon="getIcon('link')"
						/>
					</UFormField>
				</div>
				<div class="flex justify-end gap-2">
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
			</UForm>
		</template>
	</UModal>
</template>
