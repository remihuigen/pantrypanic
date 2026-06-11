import type { EffectScope, Ref } from 'vue'

import {
	normalizeOptionalIconText,
	useEditListDrawer,
	useEditListDrawerForm
} from '~/composables/useEditListDrawer'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick, reactive, ref } from 'vue'

type TestList = {
	id: string
	name: string
	icon?: string
}

type TestStore = {
	createList: ReturnType<typeof vi.fn>
	listsById: Record<string, TestList>
	updateList: ReturnType<typeof vi.fn>
}

let scopes: EffectScope[] = []

describe('useEditListDrawer', () => {
	beforeEach(() => {
		vi.restoreAllMocks()
		installUseStateStub()
		scopes = []
	})

	afterEach(() => {
		for (const scope of scopes) {
			scope.stop()
		}

		vi.unstubAllGlobals()
	})

	it('opens and closes shared drawer state', () => {
		const drawer = useEditListDrawer()

		drawer.open()

		expect(drawer.isOpen.value).toBe(true)
		expect(drawer.mode.value).toBe('create')
		expect(drawer.listId.value).toBeNull()

		drawer.close()

		expect(drawer.isOpen.value).toBe(false)
	})

	it('opens with edit context and clears list context for create mode', () => {
		const drawer = useEditListDrawer()

		drawer.open({ listId: 'list-1', mode: 'edit' })

		expect(drawer.isOpen.value).toBe(true)
		expect(drawer.mode.value).toBe('edit')
		expect(drawer.listId.value).toBe('list-1')

		drawer.open({ mode: 'create' })

		expect(drawer.mode.value).toBe('create')
		expect(drawer.listId.value).toBeNull()
	})

	it('normalizes optional icon text for submit payloads', () => {
		expect(normalizeOptionalIconText('  lucide:book  ')).toBe('lucide:book')
		expect(normalizeOptionalIconText('   ')).toBeNull()
		expect(normalizeOptionalIconText(undefined)).toBeNull()
	})

	it('requires a non-empty list name before submit', () => {
		const store = createStore()
		const { form } = createFormHarness(store)

		expect(form.canSubmit.value).toBe(false)

		form.formState.name = '  Weekend  '

		expect(form.canSubmit.value).toBe(true)
	})

	it('submits normalized form data, closes the drawer, and resets after a successful save', async () => {
		const store = createStore()
		const { drawer, form } = createFormHarness(store)

		drawer.open()
		await nextTick()
		form.formState.name = 'Weekend'
		form.formState.icon = ' lucide:book '

		await form.submitForm({
			data: {
				name: 'Weekend',
				icon: ' lucide:book '
			}
		})
		await nextTick()

		expect(store.createList).toHaveBeenCalledWith({
			name: 'Weekend',
			icon: 'lucide:book'
		})
		expect(drawer.isOpen.value).toBe(false)
		expect(form.formState).toEqual({
			name: '',
			icon: undefined
		})
	})

	it('omits empty icon values from submit payloads', async () => {
		const store = createStore()
		const { form } = createFormHarness(store)

		form.formState.name = 'Weekend'
		form.formState.icon = '   '

		await form.submitForm({
			data: {
				name: 'Weekend',
				icon: '   '
			}
		})

		expect(store.createList).toHaveBeenCalledWith({
			name: 'Weekend',
			icon: undefined
		})
	})

	it('populates current list values when opened in edit mode', async () => {
		const store = createStore({
			listsById: {
				'list-1': {
					id: 'list-1',
					name: 'Weekend',
					icon: 'lucide:book'
				}
			}
		})
		const mode = ref<'create' | 'edit'>('edit')
		const listId = ref<string | null>('list-1')
		const { drawer, form } = createFormHarness(store, { listId, mode })

		drawer.open()
		await nextTick()

		expect(form.formState).toEqual({
			name: 'Weekend',
			icon: 'lucide:book'
		})
	})

	it('keeps edited form values when store data refreshes while the drawer is open', async () => {
		const store = createStore({
			listsById: {
				'list-1': {
					id: 'list-1',
					name: 'Weekend',
					icon: 'lucide:book'
				}
			}
		})
		const mode = ref<'create' | 'edit'>('edit')
		const listId = ref<string | null>('list-1')
		const { drawer, form } = createFormHarness(store, { listId, mode })

		drawer.open()
		await nextTick()

		form.formState.name = 'Lokale wijziging'
		form.formState.icon = 'lucide:list'
		store.listsById['list-1'] = {
			id: 'list-1',
			name: 'Server refresh',
			icon: 'lucide:shopping-cart'
		}
		await nextTick()

		expect(form.formState).toEqual({
			name: 'Lokale wijziging',
			icon: 'lucide:list'
		})
	})

	it('updates normalized form data, closes the drawer, and resets after a successful edit', async () => {
		const store = createStore({
			listsById: {
				'list-1': {
					id: 'list-1',
					name: 'Weekend',
					icon: 'lucide:book'
				}
			}
		})
		const { drawer, form } = createFormHarness(store, {
			listId: ref('list-1'),
			mode: ref<'create' | 'edit'>('edit')
		})

		drawer.open()
		await nextTick()

		await form.submitForm({
			data: {
				name: 'Nieuwe naam',
				icon: ' lucide:list '
			}
		})
		await nextTick()

		expect(store.updateList).toHaveBeenCalledWith('list-1', {
			name: 'Nieuwe naam',
			icon: 'lucide:list'
		})
		expect(store.createList).not.toHaveBeenCalled()
		expect(drawer.isOpen.value).toBe(false)
		expect(form.formState).toEqual({
			name: '',
			icon: undefined
		})
	})

	it('uses drawer context to create or update the selected list', async () => {
		const store = createStore({
			listsById: {
				'list-1': {
					id: 'list-1',
					name: 'Weekend',
					icon: 'lucide:book'
				}
			}
		})
		const { drawer, form } = createFormHarness(store)

		drawer.open({ mode: 'create' })
		await nextTick()
		form.formState.name = 'Nieuwe lijst'

		await form.submitForm({
			data: {
				name: 'Nieuwe lijst',
				icon: undefined
			}
		})

		expect(store.createList).toHaveBeenCalledWith({
			name: 'Nieuwe lijst',
			icon: undefined
		})

		drawer.open({ listId: 'list-1', mode: 'edit' })
		await nextTick()

		expect(form.formState).toEqual({
			name: 'Weekend',
			icon: 'lucide:book'
		})

		await form.submitForm({
			data: {
				name: 'Weekend gewijzigd',
				icon: 'lucide:list'
			}
		})

		expect(store.updateList).toHaveBeenCalledWith('list-1', {
			name: 'Weekend gewijzigd',
			icon: 'lucide:list'
		})
	})

	it('sends null for empty edit icon values so an icon can be cleared', async () => {
		const store = createStore({
			listsById: {
				'list-1': {
					id: 'list-1',
					name: 'Weekend',
					icon: 'lucide:book'
				}
			}
		})
		const { form } = createFormHarness(store, {
			listId: ref('list-1'),
			mode: ref<'create' | 'edit'>('edit')
		})

		form.formState.name = 'Weekend'

		await form.submitForm({
			data: {
				name: 'Weekend',
				icon: undefined
			}
		})

		expect(store.updateList).toHaveBeenCalledWith('list-1', {
			name: 'Weekend',
			icon: null
		})
	})

	it('does not submit when the form is invalid', async () => {
		const store = createStore()
		const { form } = createFormHarness(store)

		await form.submitForm({
			data: {
				name: '',
				icon: 'lucide:book'
			}
		})

		expect(store.createList).not.toHaveBeenCalled()
	})

	it('shows a toast and keeps form data when submit fails', async () => {
		const error = new Error('Niet opgeslagen.')
		const store = createStore({
			createList: vi.fn(async () => {
				throw error
			})
		})
		const { drawer, form, toast } = createFormHarness(store)

		drawer.open()
		await nextTick()
		form.formState.name = 'Weekend'
		form.formState.icon = 'lucide:book'

		await form.submitForm({
			data: {
				name: 'Weekend',
				icon: 'lucide:book'
			}
		})

		expect(toast.add).toHaveBeenCalledWith({
			title: 'Niet opgeslagen.',
			color: 'error',
			duration: 8000,
			icon: 'i-lucide-circle-alert'
		})
		expect(drawer.isOpen.value).toBe(true)
		expect(form.formState).toEqual({
			name: 'Weekend',
			icon: 'lucide:book'
		})
	})

	it('shows a toast and keeps form data when edit submit fails', async () => {
		const error = new Error('Niet bijgewerkt.')
		const store = createStore({
			listsById: {
				'list-1': {
					id: 'list-1',
					name: 'Weekend',
					icon: 'lucide:book'
				}
			},
			updateList: vi.fn(async () => {
				throw error
			})
		})
		const { drawer, form, toast } = createFormHarness(store, {
			listId: ref('list-1'),
			mode: ref<'create' | 'edit'>('edit')
		})

		drawer.open()
		await nextTick()

		form.formState.name = 'Weekend aangepast'

		await form.submitForm({
			data: {
				name: 'Weekend aangepast',
				icon: 'lucide:book'
			}
		})

		expect(toast.add).toHaveBeenCalledWith({
			title: 'Niet bijgewerkt.',
			color: 'error',
			duration: 8000,
			icon: 'i-lucide-circle-alert'
		})
		expect(drawer.isOpen.value).toBe(true)
		expect(form.formState).toEqual({
			name: 'Weekend aangepast',
			icon: 'lucide:book'
		})
	})
})

/**
 * Installs a minimal Nuxt useState replacement for unit tests.
 *
 * @returns Nothing.
 */
function installUseStateStub() {
	const states = new Map<string, Ref<unknown>>()

	vi.stubGlobal('useState', <T>(key: string, init: () => T) => {
		if (!states.has(key)) {
			states.set(key, ref(init()))
		}

		return states.get(key) as Ref<T>
	})
}

/**
 * Creates a reactive lists-store test double.
 *
 * @param overrides - Optional store properties or method mocks to replace defaults.
 * @returns A store double compatible with the edit-list drawer form composable.
 */
function createStore(overrides: Partial<TestStore> = {}) {
	return reactive({
		createList: vi.fn(async () => undefined),
		listsById: {},
		updateList: vi.fn(async () => undefined),
		...overrides
	}) as TestStore
}

/**
 * Creates the drawer and form composables inside a disposable Vue effect scope.
 *
 * @param store - Lists-store test double used by the form composable.
 * @param options - Optional mode and target list refs.
 * @returns Drawer, form, toast mock, and backing effect scope.
 */
function createFormHarness(
	store: TestStore,
	options: {
		listId?: Ref<string | null>
		mode?: Ref<'create' | 'edit'>
	} = {}
) {
	const scope = effectScope()
	const toast = { add: vi.fn() }
	let drawer!: ReturnType<typeof useEditListDrawer>
	let form!: ReturnType<typeof useEditListDrawerForm>

	scope.run(() => {
		drawer = useEditListDrawer()
		form = useEditListDrawerForm({
			drawer,
			listId: options.listId,
			mode: options.mode,
			store: store as never,
			toast
		})
	})
	scopes.push(scope)

	return { drawer, form, toast, scope }
}
