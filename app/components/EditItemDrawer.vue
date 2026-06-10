<script lang="ts" setup>
import type { FormSubmitEvent } from '@nuxt/ui'
import type { EditItemDrawerSubmitData } from '~/composables/useEditItemDrawer'
import type { z } from 'zod'

import { createOccurrenceBodySchema, domainIdSchema } from '#shared/utils/schemas/domain'
import { useEditItemDrawer, useEditItemDrawerForm } from '~/composables/useEditItemDrawer'
import { computed, onActivated, onMounted, ref } from 'vue'

const editItemDrawer = useEditItemDrawer()
const editItemDrawerFormId = 'edit-item-drawer-form'
const { getIcon } = useIcon()
const {
	formState,
	nameSearchTerm,
	nameOptions,
	isDeleting,
	isSubmitting,
	listOptions,
	hasLists,
	canSubmit,
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
	editItemDrawer.mode.value === 'edit' ? 'i-lucide-save' : getIcon('plus')
)

const editItemDrawerFormSchema = createOccurrenceBodySchema.extend({
	listId: domainIdSchema
})

type EditItemDrawerFormSchema = z.output<typeof editItemDrawerFormSchema>

function handleSubmit(payload: FormSubmitEvent<EditItemDrawerFormSchema>) {
	return submitForm({ data: payload.data as EditItemDrawerSubmitData })
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
	'Kipfilet',
	'Zalm',
	'Hummus',
	'Pindakaas'
]

const currentExample = ref(exampleItems[0])

function randomlySelectExample() {
	const randomIndex = Math.floor(Math.random() * exampleItems.length)
	currentExample.value = exampleItems[randomIndex]
}
onMounted(() => {
	randomlySelectExample()
})
onActivated(() => {
	randomlySelectExample()
})
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
				class="grid min-h-[25rem] content-start gap-y-4"
				:validate-on="['blur']"
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
						v-model="formState.name"
						v-model:search-term="nameSearchTerm"
						:items="nameOptions"
						value-key="value"
						label-key="label"
						ignore-filter
						mode="autocomplete"
						:autofocus="editItemDrawer.mode.value === 'create'"
						:placeholder="`Bijvoorbeeld ${currentExample?.toLowerCase()}`"
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

				<FieldRow>
					<UFormField name="amount" size="lg">
						<UInputNumber
							v-model="formState.amount"
							:step="0.5"
							:min="0"
							placeholder="Aantal"
							:disabled="isSubmitting"
						/>
					</UFormField>

					<UFormField name="unit" size="lg">
						<UInput
							v-model="formState.unit"
							placeholder="Stuks"
							:disabled="isSubmitting"
						/>
					</UFormField>
				</FieldRow>

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
			<div class="flex w-full items-center justify-between gap-2">
				<UButton
					v-if="editItemDrawer.mode.value === 'edit'"
					variant="soft"
					color="error"
					:loading="isDeleting"
					:disabled="isSubmitting"
					icon="i-lucide-trash-2"
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
</template>
