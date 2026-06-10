<script setup lang="ts">
import type { ListItem } from '#shared/utils/schemas/domain'

import { moveArrayElement, useSortable } from '@vueuse/integrations/useSortable'

const { getIcon } = useIcon()

const props = defineProps<{
	items: ListItem[]
	listId: string
}>()

const emit = defineEmits<{
	clear: []
	edit: [listItemId: string]
	reorder: [orderedIds: string[]]
	toggleChecked: [listItemId: string]
}>()

type SortableUpdateEvent = {
	from: HTMLElement
	item: HTMLElement
	oldIndex?: number
	newIndex?: number
}

const itemGridRef = ref<HTMLElement | null>(null)
const sortableItemIds = ref<string[]>([])

const itemById = computed(() =>
	Object.fromEntries(props.items.map((item) => [item.id, item] as const))
)

watch(
	() => props.items.map((item) => item.id),
	(itemIds) => {
		if (itemIds.join('\u0000') === sortableItemIds.value.join('\u0000')) {
			return
		}

		sortableItemIds.value = [...itemIds]
	},
	{ immediate: true }
)

async function handleItemReorder(event: SortableUpdateEvent) {
	if (
		event.oldIndex === undefined ||
		event.newIndex === undefined ||
		event.oldIndex === event.newIndex
	) {
		return
	}

	moveArrayElement(sortableItemIds, event.oldIndex, event.newIndex, event)
	await nextTick()
	emit('reorder', [...sortableItemIds.value])
}

useSortable(itemGridRef, sortableItemIds, {
	animation: 180,
	draggable: '.item-card',
	onUpdate: (event: SortableUpdateEvent) => {
		void handleItemReorder(event)
	}
} as never)

const editItemDrawer = useEditItemDrawer()
function openCreateItemDrawer() {
	editItemDrawer.open({ mode: 'create', listId: props.listId })
}
</script>

<template>
	<div ref="itemGridRef" class="grid grid-cols-1 gap-3">
		<template v-for="itemId in sortableItemIds" :key="itemId">
			<ItemCard
				v-if="itemById[itemId]"
				:item="itemById[itemId]"
				@edit="emit('edit', $event)"
				@toggle-checked="emit('toggleChecked', $event)"
			/>
		</template>
		<UEmpty
			v-if="!props.items.length"
			icon="i-lucide-list-plus"
			title="Deze lijst is leeg"
			description="Voeg nu je eerste item toe aan deze lijst"
		>
			<template #actions>
				<UButton color="primary" @click="openCreateItemDrawer">+ Nieuw item</UButton>
			</template>
		</UEmpty>

		<UButton
			v-if="props.items.length > 0"
			block
			color="error"
			variant="soft"
			size="lg"
			:icon="getIcon('archive')"
			class="justify-center text-base"
			@click="emit('clear')"
		>
			Lijst leegmaken
		</UButton>
	</div>
</template>
