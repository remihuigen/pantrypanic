import type { OccurrenceInput } from '#shared/utils/schemas/domain'

import { useListsStore } from '~/stores/lists'
import { computed, onScopeDispose, reactive, readonly, ref, watch } from 'vue'

type OpenAddItemDrawerOptions = {
	listId?: string
}

type NameOption = {
	label: string
	value: string
	defaultUnit?: string
}

type AddItemDrawerToast = {
	add: (_message: { title: string; color: 'error'; duration: number; icon: string }) => void
}

type AddItemDrawerListsStore = Pick<
	ReturnType<typeof useListsStore>,
	| 'activeListId'
	| 'activeLists'
	| 'addListItem'
	| 'fetchLists'
	| 'fetchSuggestions'
	| 'searchItems'
>

type UseAddItemDrawerFormOptions = {
	debounceMs?: number
	drawer?: ReturnType<typeof useAddItemDrawer>
	store?: AddItemDrawerListsStore
	suggestionLimit?: number
	toast?: AddItemDrawerToast
}

export type AddItemDrawerFormInput = {
	listId: string
	name: string
	amount?: number
	unit?: string
	note?: string
}

export type AddItemDrawerSubmitData = AddItemDrawerFormInput

type AddItemDrawerSubmitPayload = {
	data: AddItemDrawerSubmitData
}

/**
 * Provides shared drawer state so the add-item drawer can be opened programmatically.
 *
 * @returns Drawer state and open/close controls.
 */
export function useAddItemDrawer() {
	const isOpen = useState<boolean>('add-item-drawer:is-open', () => false)
	const preferredListId = useState<string | null>('add-item-drawer:preferred-list-id', () => null)

	/**
	 * Opens the drawer and records an optional preferred list selection.
	 *
	 * @param options - Optional list context used as the initial selected list.
	 * @returns Nothing.
	 */
	function open(options: OpenAddItemDrawerOptions = {}) {
		preferredListId.value = options.listId ?? null
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
		preferredListId,
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
export function useAddItemDrawerForm(options: UseAddItemDrawerFormOptions = {}) {
	const drawer = options.drawer ?? useAddItemDrawer()
	const listsStore = options.store ?? useListsStore()
	const toast = options.toast ?? useToast()
	const debounceMs = options.debounceMs ?? 220
	const suggestionLimit = options.suggestionLimit ?? 8

	const formState = reactive<AddItemDrawerFormInput>(createDefaultFormState())
	const nameSearchTerm = ref('')
	const nameOptions = ref<NameOption[]>([])
	const isLoadingNameOptions = ref(false)
	const isSubmitting = ref(false)

	let nameSearchDebounceHandle: ReturnType<typeof setTimeout> | undefined
	let nameSearchRequestId = 0
	let isInitializingListSelection = false

	const listOptions = computed(() =>
		listsStore.activeLists.map((list) => ({
			label: list.name,
			value: list.id
		}))
	)

	const hasLists = computed(() => listOptions.value.length > 0)

	const canSubmit = computed(
		() =>
			Boolean(formState.listId && formState.name.trim().length > 0 && hasLists.value) &&
			!isSubmitting.value
	)

	watch(
		() => drawer.isOpen.value,
		async (isOpen) => {
			if (!isOpen) {
				cancelNameOptionsRefresh()
				nameOptions.value = []
				return
			}

			isInitializingListSelection = true

			try {
				await initializeListSelection()
				await refreshNameOptions('')
			} finally {
				isInitializingListSelection = false
			}
		},
		{ immediate: true }
	)

	watch(nameSearchTerm, (next) => {
		if (!drawer.isOpen.value) {
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
				nameSearchTerm.value.trim().length > 0
			) {
				return
			}

			void refreshNameOptions('')
		}
	)

	onScopeDispose(() => {
		cancelNameSearchDebounce()
	})

	/**
	 * Clears the form fields and loaded autocomplete options.
	 *
	 * @returns Nothing.
	 */
	function resetForm() {
		Object.assign(formState, createDefaultFormState())
		nameSearchTerm.value = ''
		nameOptions.value = []
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
	 * Submits the add-item form and resets the form after a successful save.
	 *
	 * @param payload - Validated Nuxt UI form payload.
	 * @returns A promise that resolves after the save attempt completes.
	 */
	async function submitForm(payload: AddItemDrawerSubmitPayload) {
		if (!canSubmit.value) {
			return
		}

		isSubmitting.value = true

		try {
			const input: OccurrenceInput = {
				name: payload.data.name,
				amount: payload.data.amount,
				unit: normalizeOptionalText(payload.data.unit),
				note: normalizeOptionalText(payload.data.note)
			}

			await listsStore.addListItem(payload.data.listId, input)

			resetForm()
		} catch (error) {
			toast.add({
				title: error instanceof Error ? error.message : 'Item kon niet worden toegevoegd.',
				color: 'error',
				duration: 8000,
				icon: 'i-lucide-circle-alert'
			})
		} finally {
			isSubmitting.value = false
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
		isSubmitting: readonly(isSubmitting),
		listOptions,
		hasLists,
		canSubmit,
		resetForm,
		refreshNameOptions,
		submitForm,
		closeAndReset
	}
}

/**
 * Builds the default mutable form state used by the add-item drawer.
 *
 * @returns A new form-state object with empty fields.
 */
function createDefaultFormState(): AddItemDrawerFormInput {
	return {
		listId: '',
		name: '',
		amount: undefined,
		unit: '',
		note: ''
	}
}

/**
 * Maps raw item suggestions to unique autocomplete options.
 *
 * @param items - Raw item names and optional default units from the item APIs.
 * @returns Deduplicated autocomplete options preserving first-seen display casing.
 */
export function mapNameOptions(items: Array<{ name: string; defaultUnit?: string }>) {
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
			defaultUnit: item.defaultUnit
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
