<script lang="ts" setup>
import type { FormSubmitEvent } from '@nuxt/ui'
import type { EditItemDrawerSubmitData } from '~/composables/useEditItemDrawer'

import { getIcon } from '#shared/utils/icons'
import { createOccurrenceBodySchema, domainIdSchema } from '#shared/utils/schemas/domain'
import { useEditItemDrawer, useEditItemDrawerForm } from '~/composables/useEditItemDrawer'
import { ref, watch } from 'vue'
import { z } from 'zod'

const editItemDrawer = useEditItemDrawer()
const editItemDrawerFormId = 'edit-item-drawer-form'
const {
	formState,
	nameSearchTerm,
	nameOptions,
	isDeleting,
	isSubmitting,
	focusRevision,
	listOptions,
	categoryOptions,
	hasLists,
	canSubmit,
	createCategory,
	submitForm,
	deleteExistingListItem,
	closeAndReset
} = useEditItemDrawerForm({ drawer: editItemDrawer })

const drawerTitle = computed(() =>
	editItemDrawer.mode.value === 'edit' ? 'Item wijzigen' : 'Item toevoegen'
)
const drawerDescription = computed(() =>
	editItemDrawer.mode.value === 'edit'
		? 'Pas de itemdetails of de lijst aan.'
		: 'Voeg snel een item toe aan een lijst.'
)
const submitLabel = computed(() => (editItemDrawer.mode.value === 'edit' ? 'Opslaan' : 'Toevoegen'))
const submitIcon = computed(() =>
	editItemDrawer.mode.value === 'edit' ? getIcon('save') : getIcon('plus')
)
const isCategoryModalOpen = ref(false)
const categoryDraft = ref('')
const isCreatingCategory = ref(false)

const editItemDrawerFormSchema = createOccurrenceBodySchema.extend({
	listId: domainIdSchema,
	categoryId: z.union([domainIdSchema, z.literal('')]).optional()
})

type EditItemDrawerFormSchema = z.output<typeof editItemDrawerFormSchema>

function handleSubmit(payload: FormSubmitEvent<EditItemDrawerFormSchema>) {
	return submitForm({ data: payload.data as EditItemDrawerSubmitData })
}

async function handleCreateCategory() {
	const name = categoryDraft.value.trim()

	if (!name || isCreatingCategory.value) {
		return
	}

	isCreatingCategory.value = true

	try {
		await createCategory({ name })
		categoryDraft.value = ''
		isCategoryModalOpen.value = false
	} finally {
		isCreatingCategory.value = false
	}
}

const exampleItems = [
	'Trostomaten',
	'Afbakbroodjes',
	'Komkommer',
	'Bananen',
	'Appels',
	'Aardbeien',
	'Broccoli',
	'Bloemkool',
	'Paprika',
	'Courgette',
	'Champignons',
	'Spinazie',
	'Aardappelen',
	'Uien',
	'Knoflook',
	'Pasta',
	'Rijst',
	'Havermout',
	'Yoghurt',
	'Kaas',
	'Eieren',
	'Melk',
	'Kipfilet',
	'Zalm',
	'Hummus',
	'Pindakaas'
]

const currentExample = ref('Trostomaten')

function randomlySelectExample() {
	currentExample.value = selectRandomExample(exampleItems, currentExample.value)
}

function selectRandomExample(examples: readonly string[], current: string) {
	const nextExamples = examples.filter((example) => example !== current)
	const selectableExamples = nextExamples.length > 0 ? nextExamples : examples
	const randomIndex = Math.floor(Math.random() * selectableExamples.length)

	return selectableExamples[randomIndex] ?? current
}

watch(
	() => editItemDrawer.isOpen.value,
	(isOpen) => {
		if (isOpen && editItemDrawer.mode.value === 'create') {
			randomlySelectExample()
		}
	}
)
</script>

<template>
	<UDrawer
		v-model:open="editItemDrawer.isOpen.value"
		:title="drawerTitle"
		:description="drawerDescription"
		handle
	>
		<template #body>
			<UForm
				:id="editItemDrawerFormId"
				:schema="editItemDrawerFormSchema"
				:state="formState"
				class="grid content-start gap-y-4"
				:validate-on="[]"
				@submit="handleSubmit"
			>
				<UAlert
					v-if="!hasLists"
					color="warning"
					variant="soft"
					title="Geen actieve lijsten beschikbaar"
					description="Maak eerst een nieuwe lijst aan voordat je items toevoegt."
				/>

				<UFormField name="name" size="xl" required>
					<UInputMenu
						:key="focusRevision"
						v-model="formState.name"
						v-model:search-term="nameSearchTerm"
						:items="nameOptions"
						value-key="value"
						label-key="label"
						ignore-filter
						mode="autocomplete"
						:autofocus="editItemDrawer.mode.value === 'create'"
						:placeholder="`Bijvoorbeeld ${currentExample.toLowerCase()}`"
						:disabled="isSubmitting"
					/>
				</UFormField>

				<UFormField name="listId" required>
					<USelect
						v-model="formState.listId"
						:items="listOptions"
						placeholder="Selecteer een lijst"
						:icon="getIcon('list')"
						:disabled="!hasLists || isSubmitting"
						size="xl"
						:ui="{ leadingIcon: 'size-4' }"
					/>
				</UFormField>

				<UFormField name="categoryId">
					<div class="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
						<USelectMenu
							v-model="formState.categoryId"
							:items="categoryOptions"
							value-key="value"
							label-key="label"
							placeholder="Categorie"
							:icon="getIcon('tags')"
							:disabled="isSubmitting"
							size="xl"
							clearable
							:autofocus="false"
							:ui="{ leadingIcon: 'size-4' }"
						/>
						<UButton
							type="button"
							color="neutral"
							variant="soft"
							size="xl"
							:icon="getIcon('plus')"
							:disabled="isSubmitting"
							class="grid aspect-square place-items-center"
							aria-label="Categorie toevoegen"
							:ui="{ leadingIcon: 'size-4' }"
							@click="isCategoryModalOpen = true"
						/>
					</div>
				</UFormField>

				<div class="grid grid-cols-2 gap-3">
					<UFormField name="amount" size="xl">
						<UInputNumber
							v-model="formState.amount"
							:step="0.5"
							:min="0.5"
							placeholder="Aantal"
							:disabled="isSubmitting"
						/>
					</UFormField>

					<UFormField name="unit" size="xl">
						<UInput
							v-model="formState.unit"
							placeholder="Stuks"
							:disabled="isSubmitting"
						/>
					</UFormField>
				</div>

				<UFormField name="note">
					<UTextarea
						v-model="formState.note"
						placeholder="Voeg een notitie toe"
						:rows="5"
						:disabled="isSubmitting"
					/>
				</UFormField>
			</UForm>
		</template>

		<template #footer>
			<div class="flex w-full items-center justify-between gap-2 py-4">
				<UButton
					v-if="editItemDrawer.mode.value === 'edit'"
					variant="soft"
					color="error"
					:loading="isDeleting"
					:disabled="isSubmitting"
					:icon="getIcon('trash')"
					@click="deleteExistingListItem"
				/>
				<span v-else />

				<div class="flex items-center justify-end gap-2">
					<UButton
						variant="ghost"
						color="neutral"
						:disabled="isSubmitting || isDeleting"
						@click="closeAndReset"
					>
						Annuleren
					</UButton>
					<UButton
						color="primary"
						type="submit"
						:form="editItemDrawerFormId"
						:loading="isSubmitting"
						:disabled="!canSubmit || isDeleting"
						:trailing-icon="submitIcon"
					>
						{{ submitLabel }}
					</UButton>
				</div>
			</div>
		</template>
	</UDrawer>

	<UModal v-model:open="isCategoryModalOpen" title="Categorie toevoegen">
		<template #body>
			<form class="grid gap-3" @submit.prevent="handleCreateCategory">
				<UInput
					v-model="categoryDraft"
					placeholder="Bijvoorbeeld Groente"
					:disabled="isCreatingCategory"
					size="xl"
				/>
			</form>
		</template>
		<template #footer>
			<div class="flex w-full justify-end gap-2">
				<UButton
					color="neutral"
					variant="ghost"
					:disabled="isCreatingCategory"
					@click="isCategoryModalOpen = false"
				>
					Annuleren
				</UButton>
				<UButton
					:icon="getIcon('plus')"
					:loading="isCreatingCategory"
					:disabled="!categoryDraft.trim()"
					@click="handleCreateCategory"
				>
					Toevoegen
				</UButton>
			</div>
		</template>
	</UModal>
</template>
