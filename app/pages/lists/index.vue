<script setup lang="ts">
import type { EditListDrawerMode } from '~/composables/useEditListDrawer'

import { moveArrayElement, useSortable } from '@vueuse/integrations/useSortable'

definePageMeta({ layout: 'app' })

const listsStore = useListsStore()
const toast = useToast()
const confirm = useConfirmDialog()
const editListDrawer = useEditListDrawer()
const editListDrawerMode = ref<EditListDrawerMode>('create')
const editListDrawerListId = ref<string | null>(null)
const listGridRef = ref<HTMLElement | null>(null)

const sortableListIds = toRef(listsStore, 'activeListIds')

const isLoadingLists = ref(false)

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

function listName(listId: string) {
	return listsStore.listsById[listId]?.name ?? 'Onbekende lijst'
}

function listIcon(listId: string) {
	return listsStore.listsById[listId]?.icon
}

function listItemCount(listId: string) {
	return listsStore.listItemIdsByListId[listId]?.length ?? 0
}

function openCreateListDrawer() {
	editListDrawerMode.value = 'create'
	editListDrawerListId.value = null
	editListDrawer.open()
}

function openEditListDrawer(listId: string) {
	editListDrawerMode.value = 'edit'
	editListDrawerListId.value = listId
	editListDrawer.open()
}

async function refreshLists() {
	isLoadingLists.value = true

	try {
		await listsStore.fetchLists('active')
		await Promise.all(
			listsStore.activeListIds.map((listId) =>
				listsStore.fetchList(listId).catch(() => undefined)
			)
		)
	} catch (error) {
		toast.add({
			title: getErrorMessage(error, 'Lijsten konden niet worden geladen.'),
			color: 'error',
			duration: 8000,
			icon: 'i-lucide-circle-alert'
		})
	} finally {
		isLoadingLists.value = false
	}
}

async function handleDeleteList(listId: string) {
	if (listsStore.activeListIds.length <= 1) {
		return
	}

	const confirmed = await confirm({
		title: 'Lijst verwijderen?',
		description: `Weet je zeker dat je "${listName(listId)}" wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.`,
		color: 'error',
		actions: [
			{
				label: 'Annuleren',
				color: 'neutral',
				variant: 'soft',
				mode: 'cancel'
			},
			{
				label: 'Verwijderen',
				color: 'error',
				variant: 'solid',
				mode: 'confirm',
				icon: 'i-lucide-trash-2'
			}
		]
	})

	if (!confirmed) {
		return
	}

	try {
		await listsStore.deleteList(listId)
	} catch (error) {
		toast.add({
			title: getErrorMessage(error, 'Lijst kon niet worden verwijderd.'),
			color: 'error',
			duration: 8000,
			icon: 'i-lucide-circle-alert'
		})

		await refreshLists()
	}
}

type SortableUpdateEvent = {
	from: HTMLElement
	item: HTMLElement
	oldIndex?: number
	newIndex?: number
}

async function handleListReorder(event: SortableUpdateEvent) {
	if (
		event.oldIndex === undefined ||
		event.newIndex === undefined ||
		event.oldIndex === event.newIndex
	) {
		return
	}

	moveArrayElement(sortableListIds, event.oldIndex, event.newIndex, event)
	await nextTick()

	try {
		await listsStore.reorderLists([...sortableListIds.value])
	} catch (error) {
		toast.add({
			title: getErrorMessage(error, 'Volgorde kon niet worden opgeslagen.'),
			color: 'error',
			duration: 8000,
			icon: 'i-lucide-circle-alert'
		})

		await refreshLists()
	}
}

useSortable(listGridRef, sortableListIds, {
	animation: 180,
	draggable: '.list-card',
	handle: '.list-card__drag-handle',
	onUpdate: (event: SortableUpdateEvent) => {
		void handleListReorder(event)
	}
} as never)

onMounted(() => {
	void refreshLists()
})
</script>

<template>
	<PageShell>
		<PageHeader :badge="listsStore.activeListIds.length"> Lijsten </PageHeader>

		<UEmpty
			v-if="!isLoadingLists && listsStore.activeListIds.length === 0"
			icon="i-lucide-list-plus"
			title="Nog geen lijsten"
			description="Maak je eerste lijst aan om items te verzamelen."
		>
			<template #actions>
				<UButton color="primary" @click="openCreateListDrawer">+ Nieuwe lijst</UButton>
			</template>
		</UEmpty>

		<div ref="listGridRef" class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
			<ListCard
				v-for="listId in listsStore.activeListIds"
				:key="listId"
				:list-id="listId"
				:name="listName(listId)"
				:icon="listIcon(listId)"
				:item-count="listItemCount(listId)"
				:can-delete="listsStore.activeListIds.length > 1"
				@delete="handleDeleteList"
				@edit-settings="openEditListDrawer"
			/>
			<UButton
				v-if="listsStore.activeListIds.length > 0"
				block
				color="primary"
				variant="soft"
				size="lg"
				class="justify-center text-base"
				@click="openCreateListDrawer"
			>
				+ Nieuwe lijst
			</UButton>
		</div>

		<EditListDrawer :mode="editListDrawerMode" :list-id="editListDrawerListId" />
	</PageShell>
</template>
