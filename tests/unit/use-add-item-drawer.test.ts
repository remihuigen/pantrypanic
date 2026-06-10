import type { EffectScope, Ref } from 'vue'

import { flushPromises } from '@vue/test-utils'
import {
	mapNameOptions,
	normalizeOptionalText,
	selectInitialListId,
	useAddItemDrawer,
	useAddItemDrawerForm
} from '~/composables/useAddItemDrawer'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick, reactive, ref } from 'vue'

type TestList = {
	id: string
	name: string
}

type TestStore = {
	activeListId: string | null
	activeLists: TestList[]
	addListItem: ReturnType<typeof vi.fn>
	fetchLists: ReturnType<typeof vi.fn>
	fetchSuggestions: ReturnType<typeof vi.fn>
	searchItems: ReturnType<typeof vi.fn>
}

const activeLists: TestList[] = [
	{ id: 'list-1', name: 'Boodschappen' },
	{ id: 'list-2', name: 'Weekend' }
]

let scopes: EffectScope[] = []

describe('useAddItemDrawer', () => {
	beforeEach(() => {
		vi.useRealTimers()
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

	it('opens with optional preferred list context and closes', () => {
		const drawer = useAddItemDrawer()

		drawer.open({ listId: 'list-1' })

		expect(drawer.isOpen.value).toBe(true)
		expect(drawer.preferredListId.value).toBe('list-1')

		drawer.close()

		expect(drawer.isOpen.value).toBe(false)
		expect(drawer.preferredListId.value).toBe('list-1')
	})

	it('maps name options by trimming, filtering empty names, and deduplicating case-insensitively', () => {
		expect(
			mapNameOptions([
				{ name: ' Melk ', defaultUnit: 'liter' },
				{ name: 'melk', defaultUnit: 'pak' },
				{ name: '' },
				{ name: 'Brood' }
			])
		).toEqual([
			{ label: 'Melk', value: 'Melk', defaultUnit: 'liter' },
			{ label: 'Brood', value: 'Brood', defaultUnit: undefined }
		])
	})

	it('normalizes optional text fields for submit payloads', () => {
		expect(normalizeOptionalText('  pak  ')).toBe('pak')
		expect(normalizeOptionalText('   ')).toBeUndefined()
		expect(normalizeOptionalText(undefined)).toBeUndefined()
	})

	it('selects preferred, active, first, or empty list ids in priority order', () => {
		const listOptions = [{ value: 'list-1' }, { value: 'list-2' }]

		expect(selectInitialListId(listOptions, 'list-2', 'list-1')).toBe('list-2')
		expect(selectInitialListId(listOptions, 'missing', 'list-1')).toBe('list-1')
		expect(selectInitialListId(listOptions, null, 'missing')).toBe('list-1')
		expect(selectInitialListId([], null, null)).toBe('')
	})

	it('hydrates active lists, selects the preferred list, and loads suggestions when opened', async () => {
		const store = createStore({
			activeLists: [],
			fetchLists: vi.fn(async () => {
				store.activeLists = [...activeLists]

				return store.activeLists
			}),
			fetchSuggestions: vi.fn(async () => [{ name: 'Melk', defaultUnit: 'liter' }])
		})
		const { drawer, form } = createFormHarness(store)

		drawer.open({ listId: 'list-2' })
		await flushFormUpdates()

		expect(store.fetchLists).toHaveBeenCalledWith('active')
		expect(form.formState.listId).toBe('list-2')
		expect(store.fetchSuggestions).toHaveBeenCalledWith('list-2', 8)
		expect(form.nameOptions.value).toEqual([
			{ label: 'Melk', value: 'Melk', defaultUnit: 'liter' }
		])
	})

	it('debounces name search while the drawer is open', async () => {
		vi.useFakeTimers()

		const store = createStore({
			activeLists: [...activeLists],
			searchItems: vi.fn(async () => [{ name: 'Tomaat' }])
		})
		const { drawer, form } = createFormHarness(store, { debounceMs: 25 })

		drawer.open()
		await flushFormUpdates()

		form.nameSearchTerm.value = ' tom '
		await nextTick()
		await vi.advanceTimersByTimeAsync(24)

		expect(store.searchItems).not.toHaveBeenCalled()

		await vi.advanceTimersByTimeAsync(1)
		await flushFormUpdates()

		expect(store.searchItems).toHaveBeenCalledWith('tom', 8)
		expect(form.nameOptions.value).toEqual([
			{ label: 'Tomaat', value: 'Tomaat', defaultUnit: undefined }
		])
	})

	it('keeps stale name option responses from replacing newer results', async () => {
		let resolveSlow!: (_items: Array<{ name: string }>) => void
		let resolveFast!: (_items: Array<{ name: string }>) => void
		const store = createStore({
			activeLists: [...activeLists],
			searchItems: vi.fn((query: string) => {
				if (query === 'slow') {
					return new Promise((resolve) => {
						resolveSlow = resolve
					})
				}

				return new Promise((resolve) => {
					resolveFast = resolve
				})
			})
		})
		const { form } = createFormHarness(store)

		const slowRefresh = form.refreshNameOptions('slow')
		const fastRefresh = form.refreshNameOptions('fast')

		resolveFast([{ name: 'Fast' }])
		await fastRefresh

		expect(form.nameOptions.value).toEqual([
			{ label: 'Fast', value: 'Fast', defaultUnit: undefined }
		])

		resolveSlow([{ name: 'Slow' }])
		await slowRefresh

		expect(form.nameOptions.value).toEqual([
			{ label: 'Fast', value: 'Fast', defaultUnit: undefined }
		])
	})

	it('submits normalized form data and resets after a successful save', async () => {
		const store = createStore({ activeLists: [...activeLists] })
		const { form } = createFormHarness(store)

		form.formState.listId = 'list-1'
		form.formState.name = 'Melk'

		await form.submitForm({
			data: {
				listId: 'list-1',
				name: 'Melk',
				amount: 2,
				unit: ' liter ',
				note: '   '
			}
		})

		expect(store.addListItem).toHaveBeenCalledWith('list-1', {
			name: 'Melk',
			amount: 2,
			unit: 'liter',
			note: undefined
		})
		expect(form.formState).toMatchObject({
			listId: '',
			name: '',
			amount: undefined,
			unit: '',
			note: ''
		})
	})

	it('shows a toast and keeps form data when submit fails', async () => {
		const error = new Error('Niet opgeslagen.')
		const store = createStore({
			activeLists: [...activeLists],
			addListItem: vi.fn(async () => {
				throw error
			})
		})
		const { form, toast } = createFormHarness(store)

		form.formState.listId = 'list-1'
		form.formState.name = 'Melk'

		await form.submitForm({
			data: {
				listId: 'list-1',
				name: 'Melk',
				unit: '',
				note: ''
			}
		})

		expect(toast.add).toHaveBeenCalledWith({
			title: 'Niet opgeslagen.',
			color: 'error',
			duration: 8000,
			icon: 'i-lucide-circle-alert'
		})
		expect(form.formState.listId).toBe('list-1')
		expect(form.formState.name).toBe('Melk')
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
 * @returns A store double compatible with the drawer form composable.
 */
function createStore(overrides: Partial<TestStore> = {}) {
	return reactive({
		activeListId: null,
		activeLists: [] as TestList[],
		addListItem: vi.fn(async () => undefined),
		fetchLists: vi.fn(async () => []),
		fetchSuggestions: vi.fn(async () => []),
		searchItems: vi.fn(async () => []),
		...overrides
	}) as TestStore
}

/**
 * Creates the drawer and form composables inside a disposable Vue effect scope.
 *
 * @param store - Lists-store test double used by the form composable.
 * @param options - Optional form timing overrides.
 * @returns Drawer, form, toast mock, and backing effect scope.
 */
function createFormHarness(store: TestStore, options: { debounceMs?: number } = {}) {
	const scope = effectScope()
	const toast = { add: vi.fn() }
	let drawer!: ReturnType<typeof useAddItemDrawer>
	let form!: ReturnType<typeof useAddItemDrawerForm>

	scope.run(() => {
		drawer = useAddItemDrawer()
		form = useAddItemDrawerForm({
			debounceMs: options.debounceMs,
			drawer,
			store: store as never,
			toast
		})
	})
	scopes.push(scope)

	return { drawer, form, toast, scope }
}

/**
 * Flushes Vue watchers and pending promise continuations used by the drawer form.
 *
 * @returns A promise that resolves after queued form updates settle.
 */
async function flushFormUpdates() {
	await nextTick()
	await flushPromises()
	await nextTick()
}
