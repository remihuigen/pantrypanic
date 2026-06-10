<script lang="ts" setup>
import { useGesture } from '@vueuse/gesture'

definePageMeta({ layout: 'app' })

const id = useRoute().params.id?.toString() as string
const gestureTarget = useTemplateRef<HTMLElement>('gestureTarget')

const store = useListsStore()
const toast = useToast()
const confirm = useConfirmDialog()
const editItemDrawer = useEditItemDrawer()
const editListDrawer = useEditListDrawer()
const list = computed(() => store.listById(id))
const canDelete = computed(() => store.listCount > 0)

if (!list.value) {
	// Handle the case where the list is not found
	throw createError({
		status: 404,
		statusText: 'Lijst niet gevonden',
		fatal: true
	})
}

const items = computed(() => store.listItemsForList(id))
const listIcon = computed(() => list.value?.icon)

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
		listId: id,
		listItemId,
		mode: 'edit'
	})
}

function openEditListDrawer() {
	editListDrawer.open()
}

async function refreshList() {
	await store.fetchList(id).catch(() => undefined)
}

async function handleItemReorder(orderedIds: string[]) {
	try {
		await store.reorderListItems(id, orderedIds)
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
		await store.clearList(id)
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
		await store.clearCheckedListItems(id)
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

useGesture(
	{
		onDragEnd: ({ swipe: [swipeX] }) => {
			if (swipeX > 0) {
				void navigateTo('/lists')
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
</script>

<template>
	<div ref="gestureTarget" class="grow touch-pan-y">
		<PageShell>
			<PageHeader :badge="items.length">
				<span class="inline-flex min-w-0 items-center gap-2">
					<UIcon v-if="listIcon" :name="listIcon" class="text-muted size-5 shrink-0" />
					<span class="truncate">{{ list?.name }}</span>
				</span>
				<template #tools>
					<ListActionMenu
						:list-id="id"
						:can-delete="canDelete"
						@edit-settings="openEditListDrawer"
					/>
				</template>
			</PageHeader>

			<ListItemGrid
				:list-id="id"
				:items="items"
				@clear="handleClearList"
				@clear-checked="handleClearChecked"
				@edit="openEditItemDrawer"
				@reorder="handleItemReorder"
				@toggle-checked="handleToggleChecked"
			/>
			<EditListDrawer mode="edit" :list-id="id" />
		</PageShell>
	</div>
</template>
