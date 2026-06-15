import type { OccurrenceInput, UpdateListItemInput } from '#shared/utils/schemas/domain'

import { useFormState } from '~/composables/useFormState'
import { useListsStore } from '~/stores/lists'
import { computed, onScopeDispose, reactive, readonly, ref, watch } from 'vue'

export type EditItemDrawerMode = 'create' | 'edit'

type OpenEditItemDrawerOptions = {
	listId?: string
	listItemId?: string
	mode?: EditItemDrawerMode
}

type NameOption = {
	label: string
	value: string
	defaultUnit?: string
	categoryId?: string
	categoryName?: string
}

type EditItemDrawerToast = {
	add: (_message: { title: string; color: 'error'; duration: number; icon: string }) => void
}

type EditItemDrawerListsStore = Pick<
	ReturnType<typeof useListsStore>,
	| 'activeListId'
	| 'activeLists'
	| 'addListItem'
	| 'categories'
	| 'createCategory'
	| 'deleteListItem'
	| 'fetchCategories'
	| 'fetchLists'
	| 'fetchSuggestions'
	| 'listItemsById'
	| 'searchItems'
	| 'updateListItem'
>

type UseEditItemDrawerFormOptions = {
	debounceMs?: number
	drawer?: ReturnType<typeof useEditItemDrawer>
	store?: EditItemDrawerListsStore
	suggestionLimit?: number
	toast?: EditItemDrawerToast
}

export type EditItemDrawerFormInput = {
	listId: string
	name: string
	categoryId?: string
	amount?: number | null
	unit?: string
	note?: string
}

export type EditItemDrawerSubmitData = EditItemDrawerFormInput

type EditItemDrawerSubmitPayload = {
	data: EditItemDrawerSubmitData
}

type NormalizedItemFormValue = {
	listId: string
	name: string
	categoryId: string | null
	amount: number | null
	unit: string | null
	note: string | null
}

/**
 * Provides shared drawer state so the edit-item drawer can be opened programmatically.
 *
 * @returns Drawer state and open/close controls.
 */
export function useEditItemDrawer() {
	const isOpen = useState<boolean>('edit-item-drawer:is-open', () => false)
	const mode = useState<EditItemDrawerMode>('edit-item-drawer:mode', () => 'create')
	const preferredListId = useState<string | null>(
		'edit-item-drawer:preferred-list-id',
		() => null
	)
	const listItemId = useState<string | null>('edit-item-drawer:list-item-id', () => null)
	const openRevision = useState<number>('edit-item-drawer:open-revision', () => 0)

	/**
	 * Opens the drawer and records an optional preferred list selection.
	 *
	 * @param options - Optional list context used as the initial selected list.
	 * @returns Nothing.
	 */
	function open(options: OpenEditItemDrawerOptions = {}) {
		mode.value = options.mode ?? 'create'
		preferredListId.value = options.listId ?? null
		listItemId.value = options.listItemId ?? null
		openRevision.value += 1
		isOpen.value = true
	}

	/**
	 * Closes the drawer without clearing the preferred list context.
	 *
	 * @returns Nothing.
	 */
	function close() {
		isOpen.value = false
	}

	return {
		isOpen,
		mode,
		preferredListId,
		listItemId,
		openRevision,
		open,
		close
	}
}

/**
 * Creates the state and actions used by the add-item drawer form.
 *
 * @param options - Optional dependencies and timing overrides for the form workflow.
 * @returns Form state, derived options, loading flags, and form action methods.
 */
export function useEditItemDrawerForm(options: UseEditItemDrawerFormOptions = {}) {
	const drawer = options.drawer ?? useEditItemDrawer()
	const listsStore = options.store ?? useListsStore()
	const toast = options.toast ?? useToast()
	const debounceMs = options.debounceMs ?? 220
	const suggestionLimit = options.suggestionLimit ?? 8

	const formState = reactive<EditItemDrawerFormInput>(createDefaultFormState())
	const nameSearchTerm = ref('')
	const nameOptions = ref<NameOption[]>([])
	const isLoadingNameOptions = ref(false)
	const isDeleting = ref(false)
	const isSubmitting = ref(false)
	const populatedContextKey = ref<string | null>(null)
	const focusRevision = ref(0)
	const initialFormValue = ref<NormalizedItemFormValue>(normalizeItemFormValue(formState))

	let nameSearchDebounceHandle: ReturnType<typeof setTimeout> | undefined
	let nameSearchRequestId = 0
	let isInitializingListSelection = false

	const listOptions = computed(() =>
		listsStore.activeLists.map((list) => ({
			label: list.name,
			value: list.id
		}))
	)
	const categoryOptions = computed(() =>
		listsStore.categories.map((category) => ({
			label: category.name,
			value: category.id
		}))
	)

	const hasLists = computed(() => listOptions.value.length > 0)
	const selectedListItem = computed(() =>
		drawer.listItemId.value ? listsStore.listItemsById[drawer.listItemId.value] : undefined
	)
	const currentFormValue = computed(() => normalizeItemFormValue(formState))
	const { isDirty, resetInitialValue } = useFormState(initialFormValue, currentFormValue)

	const canSubmit = computed(
		() =>
			Boolean(
				formState.listId &&
				formState.name.trim().length > 0 &&
				hasLists.value &&
				(drawer.mode.value === 'create' || (drawer.listItemId.value && isDirty.value))
			) && !isSubmitting.value
	)

	watch(
		() =>
			drawer.isOpen.value
				? `${drawer.openRevision.value}:${drawer.mode.value}:${drawer.listItemId.value ?? drawer.preferredListId.value ?? ''}`
				: null,
		async (contextKey) => {
			if (!contextKey) {
				populatedContextKey.value = null
				cancelNameOptionsRefresh()
				nameOptions.value = []
				resetForm({ listId: '' })
				return
			}

			if (contextKey === populatedContextKey.value) {
				return
			}

			populatedContextKey.value = contextKey
			isInitializingListSelection = true

			try {
				if (drawer.mode.value === 'edit') {
					await initializeEditSelection()
				} else {
					resetForm()
					await initializeListSelection()
					await listsStore.fetchCategories().catch(() => undefined)
					initialFormValue.value = normalizeItemFormValue(formState)
					resetInitialValue(initialFormValue)
					await refreshNameOptions('')
				}
			} finally {
				isInitializingListSelection = false
			}
		},
		{ immediate: true }
	)

	watch(nameSearchTerm, (next) => {
		if (!drawer.isOpen.value || drawer.mode.value !== 'create') {
			return
		}

		cancelNameSearchDebounce()

		nameSearchDebounceHandle = setTimeout(() => {
			void refreshNameOptions(next.trim())
		}, debounceMs)
	})

	watch(
		() => formState.listId,
		() => {
			if (
				isInitializingListSelection ||
				!drawer.isOpen.value ||
				drawer.mode.value !== 'create' ||
				nameSearchTerm.value.trim().length > 0
			) {
				return
			}

			void refreshNameOptions('')
		}
	)

	watch(
		() => [formState.name, nameOptions.value] as const,
		([name]) => {
			applySelectedItemDefaults(name)
		}
	)

	onScopeDispose(() => {
		cancelNameSearchDebounce()
	})

	/**
	 * Clears the form fields and loaded autocomplete options.
	 *
	 * @param options - Optional reset overrides for fields that should be retained.
	 * @returns Nothing.
	 */
	function resetForm(options: { listId?: string } = {}) {
		Object.assign(formState, {
			...createDefaultFormState(),
			listId: options.listId ?? drawer.preferredListId.value ?? ''
		})
		nameSearchTerm.value = ''
		nameOptions.value = []
		initialFormValue.value = normalizeItemFormValue(formState)
		resetInitialValue(initialFormValue)
		focusRevision.value += 1
	}

	/**
	 * Refreshes autocomplete options for either a search query or the selected list.
	 *
	 * @param query - Trimmed search text. Empty text loads list suggestions.
	 * @returns A promise that resolves after the latest request updates loading state.
	 */
	async function refreshNameOptions(query: string) {
		const requestId = ++nameSearchRequestId
		isLoadingNameOptions.value = true

		try {
			const items = query
				? await listsStore.searchItems(query, suggestionLimit)
				: await listsStore.fetchSuggestions(formState.listId || undefined, suggestionLimit)

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

	/**
	 * Submits the item form and resets or closes the form after a successful save.
	 *
	 * @param payload - Validated Nuxt UI form payload.
	 * @returns A promise that resolves after the save attempt completes.
	 */
	async function submitForm(payload: EditItemDrawerSubmitPayload) {
		if (!canSubmit.value) {
			return
		}

		isSubmitting.value = true

		try {
			if (drawer.mode.value === 'edit') {
				await updateExistingListItem(payload.data)
				closeAndReset()
			} else {
				await createNewListItem(payload.data)
				resetForm({ listId: payload.data.listId })
			}
		} catch (error) {
			toast.add({
				title:
					error instanceof Error
						? error.message
						: drawer.mode.value === 'edit'
							? 'Item kon niet worden bijgewerkt.'
							: 'Item kon niet worden toegevoegd.',
				color: 'error',
				duration: 8000,
				icon: 'i-lucide-circle-alert'
			})
		} finally {
			isSubmitting.value = false
		}
	}

	/**
	 * Creates a list item from submitted form data.
	 *
	 * @param data - Validated form data.
	 * @returns A promise that resolves after the item has been created.
	 */
	async function createNewListItem(data: EditItemDrawerSubmitData) {
		const categoryId = normalizeOptionalText(data.categoryId)
		const input: OccurrenceInput = {
			name: data.name,
			...(categoryId === undefined ? {} : { categoryId }),
			amount: data.amount ?? undefined,
			unit: normalizeOptionalText(data.unit),
			note: normalizeOptionalText(data.note)
		}

		await listsStore.addListItem(data.listId, input)
	}

	/**
	 * Updates the selected list item from submitted form data.
	 *
	 * @param data - Validated form data.
	 * @returns A promise that resolves after the item has been updated.
	 */
	async function updateExistingListItem(data: EditItemDrawerSubmitData) {
		if (!drawer.listItemId.value) {
			return
		}

		const input: UpdateListItemInput = {
			listId: data.listId,
			name: data.name,
			categoryId: normalizeNullableText(data.categoryId),
			amount: data.amount ?? null,
			unit: normalizeNullableText(data.unit),
			note: normalizeNullableText(data.note)
		}

		await listsStore.updateListItem(drawer.listItemId.value, input)
	}

	/**
	 * Soft-deletes the selected list item and closes the drawer after a successful delete.
	 *
	 * @returns A promise that resolves after the delete attempt completes.
	 */
	async function deleteExistingListItem() {
		if (!drawer.listItemId.value || drawer.mode.value !== 'edit') {
			return
		}

		isDeleting.value = true

		try {
			await listsStore.deleteListItem(drawer.listItemId.value)
			closeAndReset()
		} catch (error) {
			toast.add({
				title: error instanceof Error ? error.message : 'Item kon niet worden verwijderd.',
				color: 'error',
				duration: 8000,
				icon: 'i-lucide-circle-alert'
			})
		} finally {
			isDeleting.value = false
		}
	}

	/**
	 * Closes the drawer and clears transient form state.
	 *
	 * @returns Nothing.
	 */
	function closeAndReset() {
		drawer.close()
		resetForm()
	}

	/**
	 * Loads active lists when needed and selects the best initial list.
	 *
	 * @returns A promise that resolves after list state has been prepared.
	 */
	async function initializeListSelection() {
		if (listsStore.activeLists.length === 0) {
			await listsStore.fetchLists('active').catch(() => undefined)
		}

		formState.listId = selectInitialListId(
			listOptions.value,
			drawer.preferredListId.value,
			listsStore.activeListId
		)
	}

	/**
	 * Loads list options when needed and copies the selected list item into local form state.
	 *
	 * @returns A promise that resolves after edit-mode state has been prepared.
	 */
	async function initializeEditSelection() {
		if (listsStore.activeLists.length === 0) {
			await listsStore.fetchLists('active').catch(() => undefined)
		}

		const listItem = selectedListItem.value

		Object.assign(formState, {
			listId: listItem?.listId ?? '',
			name: listItem?.name ?? '',
			categoryId: listItem?.categoryId ?? '',
			amount: listItem?.amount,
			unit: listItem?.unit ?? '',
			note: listItem?.note ?? ''
		})

		nameSearchTerm.value = ''
		nameOptions.value = []
		initialFormValue.value = normalizeItemFormValue(formState)
		resetInitialValue(initialFormValue)
	}

	/**
	 * Applies a canonical item's default unit when a create-mode name option is selected.
	 *
	 * @param name - Current item name.
	 * @returns Nothing.
	 */
	function applySelectedItemDefaults(name: string) {
		if (drawer.mode.value !== 'create') {
			return
		}

		const normalizedName = name.trim().toLocaleLowerCase('nl-NL')

		if (!normalizedName) {
			return
		}

		const selectedOption = nameOptions.value.find(
			(option) => option.value.trim().toLocaleLowerCase('nl-NL') === normalizedName
		)
		const defaultUnit = selectedOption?.defaultUnit?.trim()
		const defaultCategoryId = selectedOption?.categoryId?.trim()

		if (defaultUnit && !formState.unit?.trim()) {
			formState.unit = defaultUnit
		}

		if (defaultCategoryId && !formState.categoryId?.trim()) {
			formState.categoryId = defaultCategoryId
		}
	}

	async function createCategory(input: { name: string }) {
		const category = await listsStore.createCategory(input)
		formState.categoryId = category.id
		return category
	}

	/**
	 * Cancels pending autocomplete timers and marks in-flight option requests stale.
	 *
	 * @returns Nothing.
	 */
	function cancelNameOptionsRefresh() {
		nameSearchRequestId += 1
		cancelNameSearchDebounce()
		isLoadingNameOptions.value = false
	}

	/**
	 * Clears the pending autocomplete debounce timer.
	 *
	 * @returns Nothing.
	 */
	function cancelNameSearchDebounce() {
		if (nameSearchDebounceHandle) {
			clearTimeout(nameSearchDebounceHandle)
			nameSearchDebounceHandle = undefined
		}
	}

	return {
		formState,
		nameSearchTerm,
		nameOptions,
		isLoadingNameOptions: readonly(isLoadingNameOptions),
		isDeleting: readonly(isDeleting),
		isSubmitting: readonly(isSubmitting),
		focusRevision: readonly(focusRevision),
		listOptions,
		categoryOptions,
		hasLists,
		canSubmit,
		isDirty,
		resetForm,
		refreshNameOptions,
		createCategory,
		submitForm,
		createNewListItem,
		updateExistingListItem,
		deleteExistingListItem,
		closeAndReset
	}
}

/**
 * Builds the default mutable form state used by the add-item drawer.
 *
 * @returns A new form-state object with empty fields.
 */
function createDefaultFormState(): EditItemDrawerFormInput {
	return {
		listId: '',
		name: '',
		categoryId: '',
		amount: undefined,
		unit: '',
		note: ''
	}
}

function normalizeItemFormValue(value: EditItemDrawerFormInput): NormalizedItemFormValue {
	return {
		listId: value.listId,
		name: value.name.trim(),
		categoryId: normalizeNullableText(value.categoryId),
		amount: value.amount ?? null,
		unit: normalizeNullableText(value.unit),
		note: normalizeNullableText(value.note)
	}
}

/**
 * Maps raw item suggestions to unique autocomplete options.
 *
 * @param items - Raw item names and optional default units from the item APIs.
 * @returns Deduplicated autocomplete options preserving first-seen display casing.
 */
export function mapNameOptions(
	items: Array<{ name: string; defaultUnit?: string; categoryId?: string; categoryName?: string }>
) {
	const seenNames = new Set<string>()

	return items.reduce<NameOption[]>((result, item) => {
		const trimmedName = item.name.trim()

		if (!trimmedName) {
			return result
		}

		const normalized = trimmedName.toLocaleLowerCase('nl-NL')

		if (seenNames.has(normalized)) {
			return result
		}

		seenNames.add(normalized)
		result.push({
			label: trimmedName,
			value: trimmedName,
			defaultUnit: item.defaultUnit,
			...(item.categoryId === undefined ? {} : { categoryId: item.categoryId }),
			...(item.categoryName === undefined ? {} : { categoryName: item.categoryName })
		})

		return result
	}, [])
}

/**
 * Trims optional text and converts empty strings to undefined.
 *
 * @param value - Optional form text entered by the user.
 * @returns Trimmed text when present, otherwise undefined.
 */
export function normalizeOptionalText(value: string | undefined) {
	const next = (value ?? '').trim()

	return next.length > 0 ? next : undefined
}

/**
 * Trims nullable edit text and converts empty strings to null.
 *
 * @param value - Optional form text entered by the user.
 * @returns Trimmed text when present, otherwise null.
 */
export function normalizeNullableText(value: string | undefined) {
	const next = (value ?? '').trim()

	return next.length > 0 ? next : null
}

/**
 * Selects the first valid list candidate for the drawer form.
 *
 * @param listOptions - Available active-list select options.
 * @param preferredListId - List id requested by the drawer opener.
 * @param activeListId - Currently active list id in the lists store.
 * @returns The selected list id, or an empty string when no lists are available.
 */
export function selectInitialListId(
	listOptions: Array<{ value: string }>,
	preferredListId: string | null,
	activeListId: string | null
) {
	const hasPreferredList = preferredListId
		? listOptions.some((entry) => entry.value === preferredListId)
		: false

	if (hasPreferredList && preferredListId) {
		return preferredListId
	}

	if (activeListId && listOptions.some((entry) => entry.value === activeListId)) {
		return activeListId
	}

	return listOptions[0]?.value ?? ''
}
