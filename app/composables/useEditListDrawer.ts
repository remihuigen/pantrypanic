import type { CreateListInput, UpdateListInput } from '#shared/utils/schemas/domain'
import type { MaybeRefOrGetter } from 'vue'

import { useListsStore } from '~/stores/lists'
import { computed, reactive, readonly, ref, toValue, watch } from 'vue'

export type EditListDrawerMode = 'create' | 'edit'

type OpenEditListDrawerOptions = {
	listId?: string | null
	mode?: EditListDrawerMode
}

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

type EditListDrawerSubmitContext = {
	mode: EditListDrawerMode
	listId: string | null
}

/**
 * Provides shared drawer state so the edit-list drawer can be opened programmatically.
 *
 * @returns Drawer state and open/close controls.
 */
export function useEditListDrawer() {
	const isOpen = useState<boolean>('edit-list-drawer:is-open', () => false)
	const mode = useState<EditListDrawerMode>('edit-list-drawer:mode', () => 'create')
	const listId = useState<string | null>('edit-list-drawer:list-id', () => null)
	const openRevision = useState<number>('edit-list-drawer:open-revision', () => 0)

	/**
	 * Opens the list drawer with an explicit create or edit context.
	 *
	 * @param options - Optional mode and target list context.
	 * @returns Nothing.
	 */
	function open(options: OpenEditListDrawerOptions = {}) {
		mode.value = options.mode ?? 'create'
		listId.value = mode.value === 'edit' ? (options.listId ?? null) : null
		openRevision.value += 1
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
		mode,
		listId,
		openRevision,
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
	const formState = reactive<EditListDrawerFormInput>(createDefaultFormState())

	const isSubmitting = ref(false)
	const populatedContextKey = ref<string | null>(null)
	const submitContext = ref<EditListDrawerSubmitContext | null>(null)

	const mode = computed(() =>
		options.mode === undefined ? drawer.mode.value : toValue(options.mode)
	)
	const selectedListId = computed(() =>
		options.listId === undefined ? drawer.listId.value : (toValue(options.listId) ?? null)
	)
	const activeSubmitContext = computed(
		(): EditListDrawerSubmitContext =>
			submitContext.value ?? {
				mode: mode.value,
				listId: selectedListId.value
			}
	)

	const canSubmit = computed(
		() =>
			formState.name.trim().length > 0 &&
			(activeSubmitContext.value.mode === 'create' ||
				Boolean(activeSubmitContext.value.listId)) &&
			!isSubmitting.value
	)

	watch(
		() =>
			drawer.isOpen.value
				? `${drawer.openRevision.value}:${mode.value}:${selectedListId.value ?? ''}`
				: null,
		(contextKey) => {
			if (!contextKey) {
				populatedContextKey.value = null
				submitContext.value = null
				return
			}

			if (contextKey === populatedContextKey.value) {
				return
			}

			populatedContextKey.value = contextKey
			submitContext.value = {
				mode: mode.value,
				listId: selectedListId.value
			}
			populateFormForContext(submitContext.value)
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
		populateFormForContext(activeSubmitContext.value)
	}

	/**
	 * Copies form values for a specific opened drawer context.
	 *
	 * @param context - Snapshot of the drawer context that opened the form.
	 * @returns Nothing.
	 */
	function populateFormForContext(context: EditListDrawerSubmitContext) {
		if (context.mode === 'create') {
			resetForm()
			return
		}

		const list = context.listId ? listsStore.listsById[context.listId] : undefined

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
			const context = activeSubmitContext.value

			if (context.mode === 'edit') {
				await updateExistingList(payload.data, context.listId)
			} else {
				await createNewList(payload.data)
			}

			closeAndReset()
		} catch (error) {
			toast.add({
				title:
					error instanceof Error
						? error.message
						: activeSubmitContext.value.mode === 'edit'
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
	 * @param listId - Target list id captured when the drawer opened.
	 * @returns A promise that resolves after the list has been updated.
	 */
	async function updateExistingList(data: EditListDrawerSubmitData, listId: string | null) {
		if (!listId) {
			return
		}

		const input: UpdateListInput = {
			name: data.name,
			icon: normalizeOptionalIconText(data.icon)
		}

		await listsStore.updateList(listId, input)
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
