<script lang="ts" setup>
import { useGesture } from '@vueuse/gesture'

definePageMeta({ layout: 'app' })

const route = useRoute()
const id = computed(() => route.params.id?.toString() ?? '')
const gestureTarget = useTemplateRef<HTMLElement>('gestureTarget')

const store = useListsStore()
const toast = useToast()
const confirm = useConfirmDialog()
const editItemDrawer = useEditItemDrawer()
const isLoadingList = ref(false)
const listLoadError = ref<string | null>(null)
const list = computed(() => (id.value ? store.listById(id.value) : null))
const canDelete = computed(() => store.listCount > 0)
const pageTitle = computed(
	() => list.value?.name ?? (isLoadingList.value ? 'Lijst laden...' : 'Lijst')
)
const items = computed(() => (id.value ? store.listItemsForList(id.value) : []))
const listIcon = computed(() => list.value?.icon)
let listLoadRequestId = 0

function getErrorMessage(error: unknown, fallback: string) {
	if (error && typeof error === 'object' && 'message' in error) {
		const message = (error as { message?: unknown }).message

		if (typeof message === 'string' && message.length > 0) {
			return message
		}
	}

	if (error instanceof Error && error.message) {
		return error.message
	}

	return fallback
}

function openEditItemDrawer(listItemId: string) {
	editItemDrawer.open({
		listId: id.value,
		listItemId,
		mode: 'edit'
	})
}

async function refreshList(options: { notifyOnError?: boolean } = {}) {
	const currentListId = id.value

	if (!currentListId) {
		return
	}

	const requestId = ++listLoadRequestId
	isLoadingList.value = true

	try {
		await store.fetchList(currentListId)

		if (requestId !== listLoadRequestId) {
			return
		}

		listLoadError.value = null
	} catch (error) {
		if (requestId !== listLoadRequestId) {
			return
		}

		const message = getErrorMessage(error, 'Lijst kon niet worden geladen.')
		listLoadError.value = message

		if (options.notifyOnError) {
			toast.add({
				title: message,
				color: 'error',
				duration: 8000,
				icon: 'i-lucide-circle-alert'
			})
		}
	} finally {
		if (requestId === listLoadRequestId) {
			isLoadingList.value = false
		}
	}
}

async function handleItemReorder(orderedIds: string[]) {
	try {
		await store.reorderListItems(id.value, orderedIds)
	} catch (error) {
		toast.add({
			title: getErrorMessage(error, 'Volgorde kon niet worden opgeslagen.'),
			color: 'error',
			duration: 8000,
			icon: 'i-lucide-circle-alert'
		})

		await refreshList()
	}
}

async function handleToggleChecked(listItemId: string) {
	const listItem = store.listItemsById[listItemId]

	if (!listItem) {
		return
	}

	try {
		if (listItem.status === 'checked') {
			await store.uncheckListItem(listItemId)
		} else {
			await store.checkListItem(listItemId)
		}
	} catch (error) {
		toast.add({
			title: getErrorMessage(error, 'Item kon niet worden bijgewerkt.'),
			color: 'error',
			duration: 8000,
			icon: 'i-lucide-circle-alert'
		})
	}
}

async function handleClearList() {
	const confirmed = await confirm({
		title: 'Lijst legen?',
		description: `Weet je zeker dat je alle items uit "${list.value?.name ?? 'deze lijst'}" wilt verwijderen?`,
		color: 'error',
		actions: [
			{
				label: 'Annuleren',
				color: 'neutral',
				variant: 'soft',
				mode: 'cancel'
			},
			{
				label: 'Leeg lijst',
				color: 'error',
				variant: 'solid',
				mode: 'confirm',
				icon: 'i-lucide-archive'
			}
		]
	})

	if (!confirmed) {
		return
	}

	try {
		await store.clearList(id.value)
	} catch (error) {
		toast.add({
			title: getErrorMessage(error, 'Lijst kon niet worden geleegd.'),
			color: 'error',
			duration: 8000,
			icon: 'i-lucide-circle-alert'
		})

		await refreshList()
	}
}

async function handleClearChecked() {
	try {
		await store.clearCheckedListItems(id.value)
	} catch (error) {
		toast.add({
			title: getErrorMessage(error, 'Afgeronde items konden niet worden verwijderd.'),
			color: 'error',
			duration: 8000,
			icon: 'i-lucide-circle-alert'
		})

		await refreshList()
	}
}

function blurActiveElement() {
	if (!import.meta.client || !(document.activeElement instanceof HTMLElement)) {
		return
	}

	document.activeElement.blur()
}

useGesture(
	{
		onDragEnd: ({ swipe: [swipeX] }) => {
			if (swipeX > 0) {
				blurActiveElement()
				void navigateTo('/app/lists')
			}
		}
	},
	{
		domTarget: gestureTarget,
		drag: {
			axis: 'x',
			filterTaps: true,
			swipeDistance: 60
		}
	}
)

watch(
	id,
	() => {
		if (!import.meta.client) return
		void refreshList({ notifyOnError: true })
	},
	{ immediate: true }
)
</script>

<template>
	<div ref="gestureTarget" class="grow touch-pan-y">
		<PageShell>
			<template #header>
				<PageHeader :badge="items.length">
					<span class="inline-flex min-w-0 items-start gap-2">
						<UIcon
							v-if="listIcon"
							:name="listIcon"
							class="text-muted relative top-1 size-5 shrink-0"
						/>
						<span class="min-w-0 break-words">{{ pageTitle }}</span>
					</span>
					<template #tools>
						<ListActionMenu :list-id="id" :can-delete="canDelete" />
					</template>
				</PageHeader>
			</template>

			<UAlert
				v-if="listLoadError"
				color="error"
				variant="soft"
				icon="i-lucide-circle-alert"
				title="Lijst kon niet worden geladen"
				:description="listLoadError"
			/>

			<ListItemGrid
				v-else
				:list-id="id"
				:items="items"
				@clear="handleClearList"
				@clear-checked="handleClearChecked"
				@edit="openEditItemDrawer"
				@reorder="handleItemReorder"
				@toggle-checked="handleToggleChecked"
			/>
		</PageShell>
	</div>
</template>
