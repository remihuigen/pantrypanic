<script setup lang="ts">
const props = defineProps<{
	listId: string
	canDelete: boolean
}>()

const listsStore = useListsStore()
const toast = useToast()
const confirm = useConfirmDialog()

const menuItems = computed(() => [
	[
		{
			label: 'Wijzig instellingen',
			icon: 'i-lucide-settings',
			onSelect: () => openEditListDrawer()
		},
		{
			label: 'Verwijderen',
			icon: 'i-lucide-trash-2',
			disabled: !props.canDelete,
			onSelect: async () => await handleDeleteList(props.listId)
		}
	]
])

function listName(listId: string) {
	return listsStore.listsById[listId]?.name ?? 'Onbekende lijst'
}

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

async function refreshLists() {
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

const editListDrawer = useEditListDrawer()
function openEditListDrawer() {
	editListDrawer.open({
		listId: props.listId,
		mode: 'edit'
	})
}
</script>

<template>
	<UDropdownMenu :items="menuItems" :content="{ align: 'end' }">
		<UButton
			variant="ghost"
			color="neutral"
			square
			size="sm"
			icon="i-lucide-ellipsis-vertical"
			aria-label="Acties"
			@click.stop
		/>
	</UDropdownMenu>
</template>
