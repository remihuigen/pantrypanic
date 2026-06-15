<script setup lang="ts">
import type { ListItem } from '#shared/utils/schemas/domain'

import { useSortable } from '@vueuse/integrations/useSortable'

const { getIcon } = useIcon()
const listsStore = useListsStore()

const props = defineProps<{
	items: ListItem[]
	listId: string
}>()

const emit = defineEmits<{
	clear: []
	clearChecked: []
	edit: [listItemId: string]
	reorderCategorized: [groups: Array<{ categoryId: string | null; orderedIds: string[] }>]
	reorder: [orderedIds: string[]]
	toggleChecked: [listItemId: string]
}>()

const checkedItems = computed(() => props.items.filter((item) => item.status === 'checked'))

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

const categorizedSections = computed(() => {
	const itemsByCategory = new Map<string | null, string[]>()
	const categoryMeta = new Map<string, { id: string; name: string; position: number }>()

	for (const category of listsStore.categories) {
		categoryMeta.set(category.id, {
			id: category.id,
			name: category.name,
			position: Number.MAX_SAFE_INTEGER
		})
	}

	for (const item of props.items) {
		const categoryId = item.categoryId ?? null
		itemsByCategory.set(categoryId, [...(itemsByCategory.get(categoryId) ?? []), item.id])

		if (item.categoryId && item.categoryName) {
			categoryMeta.set(item.categoryId, {
				id: item.categoryId,
				name: item.categoryName,
				position: item.categoryPosition ?? Number.MAX_SAFE_INTEGER
			})
		}
	}

	const categorySections = [...categoryMeta.values()]
		.sort(
			(left, right) =>
				left.position - right.position || left.name.localeCompare(right.name, 'nl-NL')
		)
		.map((category) => ({
			categoryId: category.id,
			label: category.name,
			itemIds: itemsByCategory.get(category.id) ?? []
		}))
		.filter((section) => section.itemIds.length > 0)

	const uncategorizedIds = itemsByCategory.get(null) ?? []

	return [
		...categorySections,
		...(uncategorizedIds.length > 0 || props.items.length === 0
			? [{ categoryId: null, label: 'Zonder categorie', itemIds: uncategorizedIds }]
			: [])
	]
})

function isSectionChecked(section: { itemIds: string[] }) {
	return (
		section.itemIds.length > 0 &&
		section.itemIds.every((itemId) => itemById.value[itemId]?.status === 'checked')
	)
}

async function handleItemReorder() {
	await nextTick()

	const root = itemGridRef.value

	if (!root) {
		return
	}

	const groups: Array<{ categoryId: string | null; orderedIds: string[] }> = []
	let currentGroup: { categoryId: string | null; orderedIds: string[] } | undefined

	for (const child of Array.from(root.children)) {
		if (!(child instanceof HTMLElement)) {
			continue
		}

		const sectionCategory = child.dataset.categorySection

		if (sectionCategory !== undefined) {
			currentGroup = {
				categoryId: sectionCategory || null,
				orderedIds: []
			}
			groups.push(currentGroup)
			continue
		}

		const itemId = child.dataset.itemId

		if (!itemId) {
			continue
		}

		if (!currentGroup) {
			currentGroup = { categoryId: null, orderedIds: [] }
			groups.push(currentGroup)
		}

		currentGroup.orderedIds.push(itemId)
	}

	const orderedIds = groups.flatMap((group) => group.orderedIds)
	sortableItemIds.value = orderedIds
	emit('reorderCategorized', groups)
}

useSortable(itemGridRef, sortableItemIds, {
	animation: 180,
	draggable: '.item-card',
	handle: '.item-card__drag-handle',
	onEnd: () => {
		void handleItemReorder()
	}
} as never)

const editItemDrawer = useEditItemDrawer()
function openCreateItemDrawer() {
	editItemDrawer.open({ mode: 'create', listId: props.listId })
}
</script>

<template>
	<div ref="itemGridRef" class="grid grid-cols-1 gap-3">
		<template
			v-for="section in categorizedSections"
			:key="section.categoryId ?? 'uncategorized'"
		>
			<div
				class="border-default/70 flex min-h-9 items-center gap-2 border-b pt-2 pb-1 text-xs font-semibold tracking-normal uppercase"
				:class="isSectionChecked(section) ? 'text-success opacity-50' : 'text-muted'"
				:data-category-section="section.categoryId ?? ''"
			>
				<span class="min-w-0 truncate">{{ section.label }}</span>
				<UBadge
					class="shrink-0 tabular-nums"
					:color="isSectionChecked(section) ? 'success' : 'neutral'"
					variant="subtle"
					size="sm"
					:label="section.itemIds.length"
				/>
			</div>
			<template v-for="itemId in section.itemIds" :key="itemId">
				<ItemCard
					v-if="itemById[itemId]"
					:item="itemById[itemId]"
					:data-item-id="itemId"
					@edit="emit('edit', $event)"
					@toggle-checked="emit('toggleChecked', $event)"
				/>
			</template>
			<div
				v-if="section.itemIds.length === 0"
				class="border-default text-muted min-h-10 rounded-md border border-dashed px-3 py-2 text-sm"
				:data-category-empty="section.categoryId ?? ''"
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
			v-if="checkedItems.length > 0"
			block
			color="success"
			variant="soft"
			size="lg"
			:icon="getIcon('check')"
			class="justify-center text-base"
			@click="emit('clearChecked')"
		>
			Afgeronde items verwijderen
		</UButton>

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
