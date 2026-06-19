<script setup lang="ts">
import { moveArrayElement, useSortable } from '@vueuse/integrations/useSortable'
import { getIcon } from '#shared/utils/icons'

definePageMeta({ layout: 'app' })

const listsStore = useListsStore()
const toast = useToast()
const editListDrawer = useEditListDrawer()
const listGridRef = ref<HTMLElement | null>(null)

const sortableListIds = toRef(listsStore, 'activeListIds')

const isLoadingLists = ref(false)
const showListsSkeleton = computed(
	() =>
		(isLoadingLists.value || listsStore.isLoading) && listsStore.activeListIds.length === 0
)

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
	editListDrawer.open({ mode: 'create' })
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
			icon: getIcon('error')
		})
	} finally {
		isLoadingLists.value = false
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
			icon: getIcon('error')
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
		<template #header>
			<PageHeader :badge="listsStore.activeListIds.length"> Lijsten </PageHeader>
		</template>
		<div v-if="showListsSkeleton" class="grid gap-4">
			<USkeleton class="h-30 w-full rounded-2xl" />
			<USkeleton class="h-30 w-full rounded-2xl" />
			<USkeleton class="h-30 w-full rounded-2xl" />
		</div>

		<UEmpty
			v-else-if="listsStore.activeListIds.length === 0"
			:icon="getIcon('listPlus')"
			title="Nog geen lijsten"
			description="Maak je eerste lijst aan om items te verzamelen."
		>
			<template #actions>
				<UButton color="primary" @click="openCreateListDrawer">+ Nieuwe lijst</UButton>
			</template>
		</UEmpty>

		<div v-else ref="listGridRef" class="grid gap-4">
			<ListCard
				v-for="listId in listsStore.activeListIds"
				:key="listId"
				:list-id="listId"
				:name="listName(listId)"
				:icon="listIcon(listId)"
				:item-count="listItemCount(listId)"
				:can-delete="listsStore.activeListIds.length > 1"
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
	</PageShell>
</template>
