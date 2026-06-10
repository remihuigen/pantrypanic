import type { CreateListInput, UpdateListInput } from '#shared/utils/schemas/domain'
import type { MaybeRefOrGetter } from 'vue'

import { useListsStore } from '~/stores/lists'
import { computed, reactive, readonly, ref, toValue, watch } from 'vue'

export type EditListDrawerMode = 'create' | 'edit'

type EditListDrawerToast = {
	add: (_message: { title: string; color: 'error'; duration: number; icon: string }) => void
}

type EditListDrawerListsStore = Pick<
	ReturnType<typeof useListsStore>,
	'createList' | 'listsById' | 'updateList'
>

type UseEditListDrawerFormOptions = {
	drawer?: ReturnType<typeof useEditListDrawer>
	listId?: MaybeRefOrGetter<string | null | undefined>
	mode?: MaybeRefOrGetter<EditListDrawerMode>
	store?: EditListDrawerListsStore
	toast?: EditListDrawerToast
}

export type EditListDrawerFormInput = {
	name: string
	icon?: string
}

export type EditListDrawerSubmitData = EditListDrawerFormInput

type EditListDrawerSubmitPayload = {
	data: EditListDrawerSubmitData
}

/**
 * Provides shared drawer state so the edit-list drawer can be opened programmatically.
 *
 * @returns Drawer state and open/close controls.
 */
export function useEditListDrawer() {
	const isOpen = useState<boolean>('edit-list-drawer:is-open', () => false)

	/**
	 * Opens the edit-list drawer.
	 *
	 * @returns Nothing.
	 */
	function open() {
		isOpen.value = true
	}

	/**
	 * Closes the edit-list drawer.
	 *
	 * @returns Nothing.
	 */
	function close() {
		isOpen.value = false
	}

	return {
		isOpen,
		open,
		close
	}
}

/**
 * Creates the state and actions used by the edit-list drawer form.
 *
 * @param options - Optional dependencies, mode, and target list context for the form workflow.
 * @returns Form state, loading flags, and form action methods.
 */
export function useEditListDrawerForm(options: UseEditListDrawerFormOptions = {}) {
	const drawer = options.drawer ?? useEditListDrawer()
	const listsStore = options.store ?? useListsStore()
	const toast = options.toast ?? useToast()
	const formState = reactive<EditListDrawerFormInput>(
		options.mode === 'edit'
			? {
					name: listsStore.listsById[toValue(options.listId) ?? '']?.name ?? '',
					icon: listsStore.listsById[toValue(options.listId) ?? '']?.icon ?? undefined
				}
			: createDefaultFormState()
	)

	const isSubmitting = ref(false)
	const populatedContextKey = ref<string | null>(null)

	const mode = computed(() => toValue(options.mode) ?? 'create')
	const selectedListId = computed(() => toValue(options.listId) ?? null)
	const selectedList = computed(() =>
		selectedListId.value ? listsStore.listsById[selectedListId.value] : undefined
	)

	const canSubmit = computed(
		() =>
			formState.name.trim().length > 0 &&
			(mode.value === 'create' || Boolean(selectedListId.value)) &&
			!isSubmitting.value
	)

	watch(
		() => (drawer.isOpen.value ? `${mode.value}:${selectedListId.value ?? ''}` : null),
		(contextKey) => {
			if (!contextKey) {
				populatedContextKey.value = null
				return
			}

			if (contextKey === populatedContextKey.value) {
				return
			}

			populatedContextKey.value = contextKey
			populateFormForMode()
		},
		{ immediate: true }
	)

	/**
	 * Clears the list form fields.
	 *
	 * @returns Nothing.
	 */
	function resetForm() {
		Object.assign(formState, createDefaultFormState())
	}

	/**
	 * Copies the selected list values into the form when editing, or clears it when creating.
	 *
	 * @returns Nothing.
	 */
	function populateFormForMode() {
		if (mode.value === 'create') {
			resetForm()
			return
		}

		const list = selectedList.value

		Object.assign(formState, {
			name: list?.name ?? '',
			icon: list?.icon
		})
	}

	/**
	 * Submits the list form in either create or edit mode and closes the drawer after a successful save.
	 *
	 * @param payload - Validated Nuxt UI form payload.
	 * @returns A promise that resolves after the save attempt completes.
	 */
	async function submitForm(payload: EditListDrawerSubmitPayload) {
		if (!canSubmit.value) {
			return
		}

		isSubmitting.value = true

		try {
			if (mode.value === 'edit') {
				await updateExistingList(payload.data)
			} else {
				await createNewList(payload.data)
			}

			closeAndReset()
		} catch (error) {
			toast.add({
				title:
					error instanceof Error
						? error.message
						: mode.value === 'edit'
							? 'Lijst kon niet worden bijgewerkt.'
							: 'Lijst kon niet worden toegevoegd.',
				color: 'error',
				duration: 8000,
				icon: 'i-lucide-circle-alert'
			})
		} finally {
			isSubmitting.value = false
		}
	}

	/**
	 * Creates a new list from submitted form data.
	 *
	 * @param data - Validated form data.
	 * @returns A promise that resolves after the list has been created.
	 */
	async function createNewList(data: EditListDrawerSubmitData) {
		const input: CreateListInput = {
			name: data.name,
			icon: normalizeOptionalIconText(data.icon) ?? undefined
		}

		await listsStore.createList(input)
	}

	/**
	 * Updates the currently selected list from submitted form data.
	 *
	 * @param data - Validated form data.
	 * @returns A promise that resolves after the list has been updated.
	 */
	async function updateExistingList(data: EditListDrawerSubmitData) {
		if (!selectedListId.value) {
			return
		}

		const input: UpdateListInput = {
			name: data.name,
			icon: normalizeOptionalIconText(data.icon)
		}

		await listsStore.updateList(selectedListId.value, input)
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

	return {
		formState,
		isSubmitting: readonly(isSubmitting),
		canSubmit,
		resetForm,
		populateFormForMode,
		submitForm,
		closeAndReset
	}
}

/**
 * Builds the default mutable form state used by the edit-list drawer.
 *
 * @returns A new form-state object with empty fields.
 */
function createDefaultFormState(): EditListDrawerFormInput {
	return {
		name: '',
		icon: undefined
	}
}

/**
 * Trims optional icon text and converts empty strings to null for edit-mode clearing.
 *
 * @param value - Optional form text entered by the user.
 * @returns Trimmed text when present, otherwise null.
 */
export function normalizeOptionalIconText(value: string | undefined) {
	const next = (value ?? '').trim()

	return next.length > 0 ? next : null
}
