<script lang="ts" setup>
import type { FormSubmitEvent } from '@nuxt/ui'
import type { EditItemDrawerSubmitData } from '~/composables/useEditItemDrawer'

import { createOccurrenceBodySchema, domainIdSchema } from '#shared/utils/schemas/domain'
import { useEditItemDrawer, useEditItemDrawerForm } from '~/composables/useEditItemDrawer'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { z } from 'zod'

const editItemDrawer = useEditItemDrawer()
const editItemDrawerFormId = 'edit-item-drawer-form'
const { getIcon } = useIcon()
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
	editItemDrawer.mode.value === 'edit' ? 'i-lucide-save' : getIcon('plus')
)
const minimalSnapPoint = '460px'
const expandedSnapPoint = '600px'
const itemDrawerSnapPoints: Array<string | number> = [minimalSnapPoint, expandedSnapPoint]
const itemDrawerActiveSnapPoint = ref<string | number | null>(null)
const nameInput = useTemplateRef<{ inputRef?: HTMLInputElement | null }>('nameInput')
const isOpeningToMinimal = ref(false)
const isItemDrawerExpanded = computed(() => itemDrawerActiveSnapPoint.value === expandedSnapPoint)
const areItemOptionsVisible = ref(false)
const isMoreOptionsButtonVisible = ref(true)
const keyboardOffsetBottom = ref(0)
const isCategoryModalOpen = ref(false)
const categoryDraft = ref('')
const isCreatingCategory = ref(false)
const drawerUi = computed(() => ({
	content: [
		'edit-item-drawer-content',
		isOpeningToMinimal.value ? 'edit-item-drawer-content--opening' : ''
	],
	overlay: 'edit-item-drawer-overlay'
}))
let resetViewFrame: number | undefined
let openingAnimationTimeout: ReturnType<typeof setTimeout> | undefined
let optionsVisibilityTimeout: ReturnType<typeof setTimeout> | undefined

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

function expandItemDrawer() {
	stopOpeningAnimation()
	itemDrawerActiveSnapPoint.value = expandedSnapPoint
}

function clearOptionsVisibilityTimeout() {
	if (optionsVisibilityTimeout !== undefined) {
		clearTimeout(optionsVisibilityTimeout)
		optionsVisibilityTimeout = undefined
	}
}

function resetItemOptionsView() {
	clearOptionsVisibilityTimeout()
	areItemOptionsVisible.value = false
	isMoreOptionsButtonVisible.value = true
}

function syncItemOptionsView(isExpanded: boolean) {
	clearOptionsVisibilityTimeout()

	if (isExpanded) {
		isMoreOptionsButtonVisible.value = false
		areItemOptionsVisible.value = true
		return
	}

	areItemOptionsVisible.value = false

	if (!import.meta.client) {
		isMoreOptionsButtonVisible.value = true
		return
	}

	optionsVisibilityTimeout = setTimeout(() => {
		isMoreOptionsButtonVisible.value = true
		optionsVisibilityTimeout = undefined
	}, 130)
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
	resetItemOptionsView()

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
	resetItemOptionsView()
	itemDrawerActiveSnapPoint.value = null
	resetKeyboardOffset()
}

function updateKeyboardOffset() {
	if (!import.meta.client || !isTextInputFocused()) {
		setKeyboardOffset(0)
		return
	}

	const visualViewport = window.visualViewport

	if (!visualViewport) {
		setKeyboardOffset(0)
		return
	}

	setKeyboardOffset(
		Math.max(
			0,
			Math.round(window.innerHeight - visualViewport.height - visualViewport.offsetTop)
		)
	)
}

function setKeyboardOffset(offset: number) {
	keyboardOffsetBottom.value = offset

	if (!import.meta.client) {
		return
	}

	document.documentElement.style.setProperty('--edit-item-drawer-keyboard-offset', `${offset}px`)
}

function resetKeyboardOffset() {
	keyboardOffsetBottom.value = 0

	if (!import.meta.client) {
		return
	}

	document.documentElement.style.removeProperty('--edit-item-drawer-keyboard-offset')
}

function isTextInputFocused() {
	if (!import.meta.client) {
		return false
	}

	const activeElement = document.activeElement

	return (
		activeElement instanceof HTMLInputElement ||
		activeElement instanceof HTMLTextAreaElement ||
		(activeElement instanceof HTMLElement && activeElement.isContentEditable)
	)
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

watch(
	() => focusRevision.value,
	async () => {
		if (
			!import.meta.client ||
			!editItemDrawer.isOpen.value ||
			editItemDrawer.mode.value !== 'create'
		) {
			return
		}

		await nextTick()
		nameInput.value?.inputRef?.focus()
	}
)

watch(isItemDrawerExpanded, (isExpanded) => {
	syncItemOptionsView(isExpanded)
})

watch(
	() => editItemDrawer.isOpen.value,
	(isOpen, _wasOpen, onCleanup) => {
		if (!import.meta.client || !isOpen) {
			resetKeyboardOffset()
			return
		}

		const visualViewport = window.visualViewport
		const updateOffset = () => updateKeyboardOffset()

		updateKeyboardOffset()
		window.addEventListener('focusin', updateOffset)
		window.addEventListener('focusout', updateOffset)
		window.addEventListener('resize', updateOffset)
		visualViewport?.addEventListener('resize', updateOffset)
		visualViewport?.addEventListener('scroll', updateOffset)

		onCleanup(() => {
			window.removeEventListener('focusin', updateOffset)
			window.removeEventListener('focusout', updateOffset)
			window.removeEventListener('resize', updateOffset)
			visualViewport?.removeEventListener('resize', updateOffset)
			visualViewport?.removeEventListener('scroll', updateOffset)
			resetKeyboardOffset()
		})
	}
)

onBeforeUnmount(() => {
	resetKeyboardOffset()
})
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
						:key="focusRevision"
						ref="nameInput"
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
				<UFormField name="categoryId">
					<div class="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
						<USelectMenu
							v-model="formState.categoryId"
							:items="categoryOptions"
							value-key="value"
							label-key="label"
							placeholder="Categorie"
							icon="i-lucide-tags"
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
							icon="i-lucide-plus"
							:disabled="isSubmitting"
							class="grid aspect-square place-items-center"
							aria-label="Categorie toevoegen"
							:ui="{ leadingIcon: 'size-4' }"
							@click="isCategoryModalOpen = true"
						/>
					</div>
				</UFormField>

				<Transition name="edit-item-drawer-more-options">
					<UButton
						v-if="isMoreOptionsButtonVisible"
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
				</Transition>

				<Transition name="edit-item-drawer-options">
					<div v-if="areItemOptionsVisible" class="edit-item-drawer-options-shell">
						<div class="edit-item-drawer-options-content grid gap-y-4">
							<FieldRow>
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
					icon="i-lucide-plus"
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

<style scoped>
.edit-item-drawer-options-enter-active {
	overflow: hidden;
	transition: max-height 190ms ease-out;
}

.edit-item-drawer-options-leave-active {
	overflow: hidden;
	transition: max-height 150ms ease-out;
}

.edit-item-drawer-options-enter-from,
.edit-item-drawer-options-leave-to {
	max-height: 0;
}

.edit-item-drawer-options-enter-to,
.edit-item-drawer-options-leave-from {
	max-height: 18rem;
}

.edit-item-drawer-options-enter-active .edit-item-drawer-options-content {
	transition:
		opacity 160ms ease-out 70ms,
		transform 160ms ease-out 70ms;
}

.edit-item-drawer-options-leave-active .edit-item-drawer-options-content {
	transition:
		opacity 120ms ease-out,
		transform 120ms ease-out;
}

.edit-item-drawer-options-enter-from .edit-item-drawer-options-content,
.edit-item-drawer-options-leave-to .edit-item-drawer-options-content {
	opacity: 0;
	transform: translateY(0.25rem);
}

.edit-item-drawer-options-enter-to .edit-item-drawer-options-content,
.edit-item-drawer-options-leave-from .edit-item-drawer-options-content {
	opacity: 1;
	transform: translateY(0);
}

.edit-item-drawer-more-options-enter-active,
.edit-item-drawer-more-options-leave-active {
	transition:
		opacity 110ms ease-out,
		transform 110ms ease-out;
}

.edit-item-drawer-more-options-enter-from,
.edit-item-drawer-more-options-leave-to {
	opacity: 0;
	transform: translateY(0.25rem);
}

.edit-item-drawer-more-options-enter-to,
.edit-item-drawer-more-options-leave-from {
	opacity: 1;
	transform: translateY(0);
}

:global(
	.edit-item-drawer-content--opening[data-state='open'][data-vaul-snap-points='true'][data-vaul-drawer-direction='bottom']
) {
	animation: edit-item-drawer-slide-to-minimal 250ms cubic-bezier(0.32, 0.72, 0, 1) both;
}

:global(.edit-item-drawer-overlay[data-vaul-snap-points='true'][data-state='open']) {
	opacity: 1 !important;
	transition: opacity 250ms ease-out !important;
}

:global(.edit-item-drawer-overlay[data-state='closed']) {
	opacity: 0 !important;
	transition: opacity 250ms ease-in !important;
}

:global(.edit-item-drawer-content[data-vaul-drawer-direction='bottom']) {
	bottom: var(--edit-item-drawer-keyboard-offset, 0px);
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
