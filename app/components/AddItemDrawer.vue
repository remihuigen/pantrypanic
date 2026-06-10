<script lang="ts" setup>
import type { FormSubmitEvent } from '@nuxt/ui'
import type { AddItemDrawerSubmitData } from '~/composables/useAddItemDrawer'
import type { z } from 'zod'

import { createOccurrenceBodySchema, domainIdSchema } from '#shared/utils/schemas/domain'
import { useAddItemDrawer, useAddItemDrawerForm } from '~/composables/useAddItemDrawer'
import { onActivated, onMounted, ref } from 'vue'

const addItemDrawer = useAddItemDrawer()
const addItemDrawerFormId = 'add-item-drawer-form'
const { getIcon } = useIcon()
const {
	formState,
	nameSearchTerm,
	nameOptions,
	isSubmitting,
	listOptions,
	hasLists,
	canSubmit,
	submitForm,
	closeAndReset
} = useAddItemDrawerForm({ drawer: addItemDrawer })

const addListItemFormSchema = createOccurrenceBodySchema.extend({
	listId: domainIdSchema
})

type AddListItemFormSchema = z.output<typeof addListItemFormSchema>

function handleSubmit(payload: FormSubmitEvent<AddListItemFormSchema>) {
	return submitForm({ data: payload.data as AddItemDrawerSubmitData })
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
		v-model:open="addItemDrawer.isOpen.value"
		title="Item toevoegen"
		description="Voeg snel een item toe aan een lijst."
		handle
	>
		<template #body>
			<UForm
				:id="addItemDrawerFormId"
				:schema="addListItemFormSchema"
				:state="formState"
				class="grid space-y-4"
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
						autofocus
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

				<div class="grid grid-cols-2 gap-3">
					<UFormField name="amount" size="lg">
						<UInputNumber
							v-model="formState.amount"
							:step="0.1"
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
					:form="addItemDrawerFormId"
					:loading="isSubmitting"
					:disabled="!canSubmit"
					:trailing-icon="getIcon('plus')"
				>
					Toevoegen
				</UButton>
			</div>
		</template>
	</UDrawer>
</template>
