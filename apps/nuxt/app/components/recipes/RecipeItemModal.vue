<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import type { RecipeItem } from '#shared/utils/schemas/domain'

import { getIcon } from '#shared/utils/icons'
import {
	createRecipeItemBodySchema,
	domainIdSchema,
	updateRecipeItemBodySchema
} from '#shared/utils/schemas/domain'
import { mapNameOptions } from '~/composables/useEditItemDrawer'
import { z } from 'zod'

type RecipeItemFormState = {
	name: string
	categoryId: string
	amount?: number | null
	unit?: string
	note?: string
}

type NormalizedRecipeItemFormState = {
	name: string
	categoryId: string | null
	amount: number | null
	unit: string | null
	note: string | null
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
const listsStore = useListsStore()
const toast = useToast()
const confirm = useConfirmDialog()
const state = reactive<RecipeItemFormState>({
	name: '',
	categoryId: '',
	amount: undefined,
	unit: undefined,
	note: undefined
})
const initialFormValue = shallowRef<NormalizedRecipeItemFormState>(
	normalizeRecipeItemFormValue(state)
)
const nameSearchTerm = shallowRef('')
const nameOptions = shallowRef<
	Array<{ label: string; value: string; defaultUnit?: string; categoryId?: string }>
>([])
const isLoadingNameOptions = shallowRef(false)
let nameSearchDebounceHandle: ReturnType<typeof setTimeout> | undefined
let nameSearchRequestId = 0
const categoryFieldSchema = z.union([domainIdSchema, z.literal('')]).optional()
const createRecipeItemFormSchema = createRecipeItemBodySchema.extend({
	categoryId: categoryFieldSchema
})
const updateRecipeItemFormSchema = updateRecipeItemBodySchema.safeExtend({
	categoryId: categoryFieldSchema
})

type RecipeItemFormSchema =
	| z.output<typeof createRecipeItemFormSchema>
	| z.output<typeof updateRecipeItemFormSchema>

const isEditing = computed(() => Boolean(props.item))
const modalTitle = computed(() =>
	isEditing.value ? 'Ingredient wijzigen' : 'Ingredient toevoegen'
)
const modalDescription = computed(() =>
	isEditing.value
		? 'Werk de naam, categorie, hoeveelheid, eenheid of notitie bij.'
		: 'Voeg een ingredient toe aan dit recept.'
)
const submitLabel = computed(() => (isEditing.value ? 'Opslaan' : 'Toevoegen'))
const submitIcon = computed(() => (isEditing.value ? getIcon('save') : getIcon('plus')))
const categoryOptions = computed(() =>
	listsStore.categories.map((category) => ({
		label: category.name,
		value: category.id
	}))
)
const currentFormValue = computed(() => normalizeRecipeItemFormValue(state))
const { isDirty, resetInitialValue } = useFormState(initialFormValue, currentFormValue)
const canSubmit = computed(
	() =>
		state.name.trim().length > 0 &&
		(!isEditing.value || isDirty.value) &&
		!recipesStore.isSaving
)

watch(
	() => [isOpen.value, props.item?.id] as const,
	async ([open]) => {
		if (!open) {
			cancelNameOptionsRefresh()
			return
		}

		syncState()
		await Promise.all([
			listsStore.fetchCategories().catch(() => undefined),
			refreshNameOptions(nameSearchTerm.value.trim())
		])
	},
	{ immediate: true }
)

watch(nameSearchTerm, (next) => {
	if (!isOpen.value) {
		return
	}

	cancelNameSearchDebounce()
	nameSearchDebounceHandle = setTimeout(() => {
		void refreshNameOptions(next.trim())
	}, 220)
})

watch(
	() => [state.name, nameOptions.value] as const,
	([name]) => {
		applySelectedItemDefaults(name)
	}
)

onScopeDispose(() => {
	cancelNameOptionsRefresh()
})

async function submitItem(event: FormSubmitEvent<RecipeItemFormState>) {
	if (!canSubmit.value) {
		return
	}

	try {
		if (props.item) {
			await recipesStore.updateRecipeItem(props.item.id, {
				name: event.data.name.trim(),
				categoryId: normalizeNullableCategoryId(event.data.categoryId),
				amount: event.data.amount ?? null,
				unit: normalizeNullableText(event.data.unit),
				note: normalizeNullableText(event.data.note)
			})
		} else {
			await recipesStore.addRecipeItem(props.recipeId, {
				name: event.data.name.trim(),
				categoryId: normalizeOptionalCategoryId(event.data.categoryId),
				amount: event.data.amount ?? undefined,
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
			icon: getIcon('error')
		})
	}
}

function handleSubmit(event: FormSubmitEvent<RecipeItemFormSchema>) {
	return submitItem(event as FormSubmitEvent<RecipeItemFormState>)
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
				icon: getIcon('trash')
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
			icon: getIcon('error')
		})
	}
}

function syncState() {
	Object.assign(state, {
		name: props.item?.name ?? '',
		categoryId: props.item?.categoryId ?? '',
		amount: props.item?.amount,
		unit: props.item?.unit,
		note: props.item?.note
	})
	nameSearchTerm.value = props.item?.name ?? ''
	initialFormValue.value = normalizeRecipeItemFormValue(state)
	resetInitialValue(initialFormValue)
}

async function refreshNameOptions(query: string) {
	const requestId = ++nameSearchRequestId
	isLoadingNameOptions.value = true

	try {
		const items = query
			? await listsStore.searchItems(query, 8)
			: await listsStore.fetchSuggestions(undefined, 8)

		if (requestId !== nameSearchRequestId) {
			return
		}

		nameOptions.value = mapNameOptions(items)
	} catch {
		if (requestId === nameSearchRequestId) {
			nameOptions.value = []
		}
	} finally {
		if (requestId === nameSearchRequestId) {
			isLoadingNameOptions.value = false
		}
	}
}

function applySelectedItemDefaults(name: string) {
	const normalizedName = name.trim().toLocaleLowerCase('nl-NL')

	if (!normalizedName) {
		return
	}

	const selectedOption = nameOptions.value.find(
		(option) => option.value.trim().toLocaleLowerCase('nl-NL') === normalizedName
	)
	const defaultUnit = selectedOption?.defaultUnit?.trim()
	const defaultCategoryId = selectedOption?.categoryId?.trim()

	if (defaultUnit && !state.unit?.trim()) {
		state.unit = defaultUnit
	}

	if (defaultCategoryId && !state.categoryId.trim()) {
		state.categoryId = defaultCategoryId
	}
}

function cancelNameOptionsRefresh() {
	nameSearchRequestId += 1
	cancelNameSearchDebounce()
	isLoadingNameOptions.value = false
}

function cancelNameSearchDebounce() {
	if (nameSearchDebounceHandle) {
		clearTimeout(nameSearchDebounceHandle)
		nameSearchDebounceHandle = undefined
	}
}

function normalizeOptionalText(value: string | undefined) {
	const normalized = value?.trim()

	return normalized ? normalized : undefined
}

function normalizeOptionalCategoryId(value: string | undefined) {
	const normalized = value?.trim()

	return normalized ? normalized : undefined
}

function normalizeNullableText(value: string | undefined) {
	const normalized = value?.trim()

	return normalized ? normalized : null
}

function normalizeNullableCategoryId(value: string | undefined) {
	const normalized = value?.trim()

	return normalized ? normalized : null
}

function normalizeRecipeItemFormValue(value: RecipeItemFormState): NormalizedRecipeItemFormState {
	return {
		name: value.name.trim(),
		categoryId: normalizeNullableCategoryId(value.categoryId),
		amount: value.amount ?? null,
		unit: normalizeNullableText(value.unit),
		note: normalizeNullableText(value.note)
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
				:schema="isEditing ? updateRecipeItemFormSchema : createRecipeItemFormSchema"
				:state="state"
				class="grid gap-4"
				@submit="handleSubmit"
			>
				<UFormField label="Naam" name="name" required>
					<UInputMenu
						v-model="state.name"
						v-model:search-term="nameSearchTerm"
						:items="nameOptions"
						value-key="value"
						label-key="label"
						ignore-filter
						mode="autocomplete"
						placeholder="Tomaten"
						:autofocus="!isEditing"
					/>
				</UFormField>
				<UFormField label="Categorie" name="categoryId">
					<USelectMenu
						v-model="state.categoryId"
						:items="categoryOptions"
						value-key="value"
						label-key="label"
						placeholder="Categorie"
						:icon="getIcon('tags')"
						clearable
					/>
				</UFormField>
				<div class="grid grid-cols-2 gap-3">
					<UFormField label="Aantal" name="amount">
						<UInputNumber
							v-model="state.amount"
							:min="0.5"
							:step="0.5"
							placeholder="Aantal"
						/>
					</UFormField>
					<UFormField label="Eenheid" name="unit">
						<UInput v-model="state.unit" placeholder="Stuks" />
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
						:icon="getIcon('trash')"
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
