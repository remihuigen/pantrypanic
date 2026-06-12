<script setup lang="ts">
import type { RecipeItem } from '#shared/utils/schemas/domain'

import { moveArrayElement, useSortable } from '@vueuse/integrations/useSortable'

const props = defineProps<{
	items: RecipeItem[]
}>()

const emit = defineEmits<{
	add: []
	edit: [recipeItemId: string]
	reorder: [orderedIds: string[]]
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
	draggable: '.recipe-item-card',
	handle: '.recipe-item-card__drag-handle',
	onUpdate: (event: SortableUpdateEvent) => {
		void handleItemReorder(event)
	}
} as never)
</script>

<template>
	<div ref="itemGridRef" class="grid grid-cols-1 gap-3">
		<template v-for="itemId in sortableItemIds" :key="itemId">
			<RecipeItemCard
				v-if="itemById[itemId]"
				:item="itemById[itemId]"
				@edit="emit('edit', $event)"
			/>
		</template>

		<UEmpty
			v-if="!props.items.length"
			icon="i-lucide-list-plus"
			title="Nog geen ingredienten"
			description="Voeg ingredienten toe voordat je dit recept naar een lijst kopieert."
			variant="subtle"
		>
			<template #actions>
				<UButton color="primary" icon="i-lucide-plus" @click="emit('add')">
					Ingredient toevoegen
				</UButton>
			</template>
		</UEmpty>

		<UButton
			v-if="props.items.length > 0"
			block
			color="primary"
			variant="soft"
			size="lg"
			icon="i-lucide-plus"
			class="justify-center text-base"
			@click="emit('add')"
		>
			Ingredient toevoegen
		</UButton>
	</div>
</template>
