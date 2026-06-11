<script lang="ts" setup>
import type { FormSubmitEvent } from '@nuxt/ui'
import type { EditItemDrawerSubmitData } from '~/composables/useEditItemDrawer'
import type { z } from 'zod'

import { createOccurrenceBodySchema, domainIdSchema } from '#shared/utils/schemas/domain'
import { useEditItemDrawer, useEditItemDrawerForm } from '~/composables/useEditItemDrawer'
import { computed, ref, watch } from 'vue'

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
const minimalSnapPoint = 0.52
const expandedSnapPoint = 0.92
const itemDrawerSnapPoints: Array<string | number> = [minimalSnapPoint, expandedSnapPoint]
const itemDrawerActiveSnapPoint = ref<string | number | null>(null)
const isOpeningToMinimal = ref(false)
const isItemDrawerExpanded = computed(() => itemDrawerActiveSnapPoint.value === expandedSnapPoint)
const drawerUi = computed(() => ({
	content: [
		'edit-item-drawer-content',
		isOpeningToMinimal.value ? 'edit-item-drawer-content--opening' : ''
	],
	overlay: 'edit-item-drawer-overlay'
}))
let resetViewFrame: number | undefined
let openingAnimationTimeout: ReturnType<typeof setTimeout> | undefined

const editItemDrawerFormSchema = createOccurrenceBodySchema.extend({
	listId: domainIdSchema
})

type EditItemDrawerFormSchema = z.output<typeof editItemDrawerFormSchema>

function handleSubmit(payload: FormSubmitEvent<EditItemDrawerFormSchema>) {
	return submitForm({ data: payload.data as EditItemDrawerSubmitData })
}

function expandItemDrawer() {
	stopOpeningAnimation()
	itemDrawerActiveSnapPoint.value = expandedSnapPoint
}

function stopOpeningAnimation() {
	isOpeningToMinimal.value = false

	if (openingAnimationTimeout !== undefined) {
		clearTimeout(openingAnimationTimeout)
		openingAnimationTimeout = undefined
	}
}

function resetItemDrawerView() {
	itemDrawerActiveSnapPoint.value = null
	stopOpeningAnimation()

	if (!import.meta.client) {
		itemDrawerActiveSnapPoint.value = minimalSnapPoint
		return
	}

	if (resetViewFrame !== undefined) {
		window.cancelAnimationFrame(resetViewFrame)
	}

	resetViewFrame = window.requestAnimationFrame(() => {
		isOpeningToMinimal.value = true
		itemDrawerActiveSnapPoint.value = minimalSnapPoint
		resetViewFrame = undefined
		openingAnimationTimeout = setTimeout(() => {
			stopOpeningAnimation()
		}, 220)
	})
}

function handleDrawerAnimationEnd(isOpen: boolean) {
	if (isOpen) {
		return
	}

	if (resetViewFrame !== undefined && import.meta.client) {
		window.cancelAnimationFrame(resetViewFrame)
		resetViewFrame = undefined
	}

	stopOpeningAnimation()
	itemDrawerActiveSnapPoint.value = null
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
		if (isOpen) {
			resetItemDrawerView()

			if (editItemDrawer.mode.value === 'create') {
				randomlySelectExample()
			}
		}
	}
)
</script>

<template>
	<UDrawer
		v-model:open="editItemDrawer.isOpen.value"
		v-model:active-snap-point="itemDrawerActiveSnapPoint"
		:title="drawerTitle"
		:description="drawerDescription"
		:snap-points="itemDrawerSnapPoints"
		:ui="drawerUi"
		handle
		@animation-end="handleDrawerAnimationEnd"
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

				<UButton
					v-if="!isItemDrawerExpanded"
					type="button"
					variant="ghost"
					color="neutral"
					size="sm"
					icon="i-lucide-sliders-horizontal"
					class="justify-self-start"
					:disabled="isSubmitting"
					@click="expandItemDrawer"
				>
					Meer opties
				</UButton>

				<Transition name="edit-item-drawer-options">
					<div v-if="isItemDrawerExpanded" class="grid gap-y-4">
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
					</div>
				</Transition>
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

<style scoped>
.edit-item-drawer-options-enter-active,
.edit-item-drawer-options-leave-active {
	overflow: hidden;
	transition:
		opacity 120ms ease-out,
		transform 120ms ease-out,
		max-height 140ms ease-out;
}

.edit-item-drawer-options-enter-from,
.edit-item-drawer-options-leave-to {
	max-height: 0;
	opacity: 0;
	transform: translateY(-0.25rem);
}

.edit-item-drawer-options-enter-to,
.edit-item-drawer-options-leave-from {
	max-height: 18rem;
	opacity: 1;
	transform: translateY(0);
}

:global(.edit-item-drawer-content--opening[data-state='open'][data-vaul-snap-points='true'][data-vaul-drawer-direction='bottom']) {
	animation: edit-item-drawer-slide-to-minimal 180ms cubic-bezier(0.32, 0.72, 0, 1) both;
}

:global(.edit-item-drawer-overlay[data-vaul-snap-points='true'][data-state='open']) {
	opacity: 1 !important;
	transition: opacity 180ms ease-out !important;
}

:global(.edit-item-drawer-overlay[data-state='closed']) {
	opacity: 0 !important;
	transition: opacity 180ms ease-in !important;
}

@keyframes edit-item-drawer-slide-to-minimal {
	from {
		transform: translate3d(0, var(--initial-transform, 100%), 0);
	}

	to {
		transform: translate3d(0, var(--snap-point-height, 0), 0);
	}
}
</style>
