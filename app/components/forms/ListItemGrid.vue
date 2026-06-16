<script setup lang="ts">
import type { ListItem } from '#shared/utils/schemas/domain'
import type { CategorySection } from '~/utils/listItemGrid'
import type { SortableEvent } from 'sortablejs'

import {
	DEFAULT_CATEGORY_KEY,
	DEFAULT_CATEGORY_LABEL,
	moveItemToSectionTail
} from '~/utils/listItemGrid'
import Sortable from 'sortablejs'

const MAX_CATEGORY_POSITION = Number.MAX_SAFE_INTEGER

const { getIcon } = useIcon()

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
const itemGridRef = useTemplateRef<HTMLElement>('itemGridRef')
const collapsedSectionKeys = shallowRef<string[]>([])
const activeHeaderDropSectionKey = shallowRef<string | null>(null)
const isItemDragActive = shallowRef(false)
const headerSortables = ref<Sortable[]>([])
const itemSortables = ref<Sortable[]>([])
const renderedSections = shallowRef(buildCategorizedSections(props.items))
const sectionSortable = ref<Sortable | null>(null)

const itemById = computed(() =>
	Object.fromEntries(props.items.map((item) => [item.id, item] as const))
)

function getSectionKey(categoryId: string | null) {
	return categoryId ?? DEFAULT_CATEGORY_KEY
}

function getSectionRenderKey(section: CategorySection) {
	return `${section.key}:${section.itemIds.join(',')}`
}

function buildCategorizedSections(items: ListItem[]) {
	const itemsByCategory = new Map<string | null, string[]>()
	const categoryMeta = new Map<
		string,
		{ categoryId: string | null; key: string; label: string; position: number }
	>()

	for (const item of items) {
		const categoryId = item.categoryId ?? null
		const key = getSectionKey(categoryId)
		itemsByCategory.set(categoryId, [...(itemsByCategory.get(categoryId) ?? []), item.id])

		if (item.categoryId && item.categoryName) {
			categoryMeta.set(key, {
				categoryId: item.categoryId,
				key,
				label: item.categoryName,
				position: item.categoryPosition ?? MAX_CATEGORY_POSITION
			})
			continue
		}

		categoryMeta.set(key, {
			categoryId: null,
			key,
			label: DEFAULT_CATEGORY_LABEL,
			position: item.categoryPosition ?? MAX_CATEGORY_POSITION
		})
	}

	return [...categoryMeta.values()]
		.sort(
			(left, right) =>
				left.position - right.position || left.label.localeCompare(right.label, 'nl-NL')
		)
		.map((category) => ({
			key: category.key,
			categoryId: category.categoryId,
			label: category.label,
			itemIds: itemsByCategory.get(category.categoryId) ?? []
		}))
}

const categorizedSections = computed(() => buildCategorizedSections(props.items))

function isSectionChecked(section: CategorySection) {
	return (
		section.itemIds.length > 0 &&
		section.itemIds.every((itemId) => itemById.value[itemId]?.status === 'checked')
	)
}

function isSectionCollapsed(section: CategorySection) {
	return collapsedSectionKeys.value.includes(section.key)
}

function toggleSectionCollapse(sectionKey: string) {
	collapsedSectionKeys.value = collapsedSectionKeys.value.includes(sectionKey)
		? collapsedSectionKeys.value.filter((key) => key !== sectionKey)
		: [...collapsedSectionKeys.value, sectionKey]
}

function readGroupsFromDom() {
	const root = itemGridRef.value

	if (!root) {
		return []
	}

	const groups: Array<{ categoryId: string | null; orderedIds: string[]; sectionKey: string }> =
		[]

	for (const sectionElement of root.querySelectorAll<HTMLElement>('.list-item-grid__section')) {
		const categoryId = sectionElement.dataset.categoryId || null
		const sectionKey = sectionElement.dataset.sectionKey ?? getSectionKey(categoryId)
		const orderedIds = [...sectionElement.querySelectorAll<HTMLElement>('[data-item-id]')]
			.map((itemElement) => itemElement.dataset.itemId ?? '')
			.filter(Boolean)

		groups.push({ categoryId, orderedIds, sectionKey })
	}

	return groups
}

async function emitCategorizedReorder() {
	await nextTick()
	const groups = readGroupsFromDom()

	if (groups.length === 0) {
		return
	}

	const sectionsByKey = new Map(
		renderedSections.value.map((section) => [section.key, section] as const)
	)

	renderedSections.value = groups.map((group) => {
		const existingSection = sectionsByKey.get(group.sectionKey)
		const firstOrderedId = group.orderedIds[0]

		return {
			key: group.sectionKey,
			categoryId: group.categoryId,
			label:
				existingSection?.label ??
				(group.categoryId && firstOrderedId
					? (itemById.value[firstOrderedId]?.categoryName ?? '')
					: DEFAULT_CATEGORY_LABEL),
			itemIds: group.orderedIds
		}
	})

	emit(
		'reorderCategorized',
		groups.map(({ categoryId, orderedIds }) => ({ categoryId, orderedIds }))
	)
}

function findSectionItemContainer(sectionKey: string) {
	const root = itemGridRef.value

	if (!root) {
		return null
	}

	for (const sectionElement of root.querySelectorAll<HTMLElement>('.list-item-grid__section')) {
		if (sectionElement.dataset.sectionKey !== sectionKey) {
			continue
		}

		return sectionElement.querySelector<HTMLElement>('[data-item-container]')
	}

	return null
}

function clearDragState() {
	activeHeaderDropSectionKey.value = null
	isItemDragActive.value = false
}

function updateActiveHeaderDropSection(event: SortableEvent) {
	activeHeaderDropSectionKey.value = event.to.dataset.dropSectionKey ?? null
}

function handleHeaderDrop(event: SortableEvent) {
	const targetSectionKey = event.to.dataset.dropSectionKey
	const draggedItemId = event.item.dataset.itemId

	if (!targetSectionKey || !draggedItemId) {
		return
	}

	const targetContainer = findSectionItemContainer(targetSectionKey)

	if (!targetContainer) {
		return
	}

	targetContainer.append(event.item)
	renderedSections.value = moveItemToSectionTail(
		renderedSections.value,
		draggedItemId,
		targetSectionKey
	)
	activeHeaderDropSectionKey.value = targetSectionKey
}

function destroySortables() {
	for (const sortable of headerSortables.value) {
		sortable.destroy()
	}

	for (const sortable of itemSortables.value) {
		sortable.destroy()
	}

	headerSortables.value = []
	itemSortables.value = []
	sectionSortable.value?.destroy()
	sectionSortable.value = null
}

async function initializeSortables() {
	if (!import.meta.client) {
		return
	}

	await nextTick()
	destroySortables()

	const root = itemGridRef.value

	if (!root) {
		return
	}

	sectionSortable.value = Sortable.create(root, {
		animation: 180,
		delay: 120,
		delayOnTouchOnly: true,
		draggable: '.list-item-grid__section',
		fallbackTolerance: 4,
		handle: '.list-item-grid__section-handle',
		touchStartThreshold: 4,
		onEnd: () => {
			void emitCategorizedReorder()
		}
	})

	for (const itemContainer of root.querySelectorAll<HTMLElement>('[data-item-container]')) {
		itemSortables.value.push(
			Sortable.create(itemContainer, {
				animation: 180,
				delay: 120,
				delayOnTouchOnly: true,
				draggable: '.item-card',
				emptyInsertThreshold: 24,
				fallbackTolerance: 4,
				group: 'list-item-grid-items',
				onChoose: () => {
					isItemDragActive.value = true
				},
				onMove: (event) => {
					updateActiveHeaderDropSection(event)
					return true
				},
				touchStartThreshold: 4,
				onEnd: () => {
					clearDragState()
					void emitCategorizedReorder()
				}
			})
		)
	}

	for (const headerDropzone of root.querySelectorAll<HTMLElement>('[data-header-dropzone]')) {
		headerSortables.value.push(
			Sortable.create(headerDropzone, {
				animation: 180,
				emptyInsertThreshold: 24,
				fallbackTolerance: 4,
				group: 'list-item-grid-items',
				onAdd: (event) => {
					handleHeaderDrop(event)
				},
				onEnd: () => {
					activeHeaderDropSectionKey.value = null
				},
				onMove: (event) => {
					updateActiveHeaderDropSection(event)
					return true
				},
				sort: false
			})
		)
	}
}

watch(
	categorizedSections,
	(sections) => {
		renderedSections.value = sections
	},
	{ immediate: true }
)

watch(
	() =>
		renderedSections.value
			.map(
				(section) =>
					`${section.key}:${section.itemIds.join(',')}:${isSectionCollapsed(section) ? 'collapsed' : 'open'}`
			)
			.join('|'),
	() => {
		void initializeSortables()
	},
	{ immediate: true, flush: 'post' }
)

watch(
	() => renderedSections.value.map((section) => section.key),
	(sectionKeys) => {
		collapsedSectionKeys.value = collapsedSectionKeys.value.filter((sectionKey) =>
			sectionKeys.includes(sectionKey)
		)
	},
	{ immediate: true }
)

onBeforeUnmount(() => {
	destroySortables()
})

const editItemDrawer = useEditItemDrawer()
function openCreateItemDrawer() {
	editItemDrawer.open({ mode: 'create', listId: props.listId })
}
</script>

<template>
	<div ref="itemGridRef" class="list-item-grid grid grid-cols-1 gap-3">
		<section
			v-for="section in renderedSections"
			:key="getSectionRenderKey(section)"
			class="list-item-grid__section grid gap-3"
			:data-category-id="section.categoryId ?? ''"
			:data-section-key="section.key"
		>
			<div
				class="list-item-grid__section-header border-default/70 relative flex min-h-9 items-center rounded-md border-b px-1 pt-2 pb-1 text-xs font-semibold tracking-normal uppercase transition-colors duration-150"
				:class="[
					isSectionChecked(section) ? 'text-success opacity-50' : 'text-muted',
					activeHeaderDropSectionKey === section.key ? 'bg-elevated/30' : ''
				]"
			>
				<div
					:data-drop-section-key="section.key"
					:class="isItemDragActive ? 'pointer-events-auto' : 'pointer-events-none'"
					class="absolute inset-0 z-20 rounded-md"
					data-header-dropzone
				/>
				<button
					type="button"
					class="list-item-grid__section-handle text-muted relative z-10 flex items-center overflow-hidden transition-all duration-200 ease-out"
					:class="
						isSectionCollapsed(section)
							? 'me-2 w-4 translate-x-0 cursor-grab opacity-100 active:cursor-grabbing'
							: 'pointer-events-none w-0 -translate-x-1 opacity-0'
					"
					:aria-label="`Versleep ${section.label}`"
					tabindex="-1"
				>
					<UIcon name="i-lucide-grip-vertical" class="size-4 shrink-0" />
				</button>

				<button
					type="button"
					class="relative z-10 flex min-w-0 flex-1 items-center justify-between gap-2 text-left"
					:aria-expanded="!isSectionCollapsed(section)"
					:aria-label="
						isSectionCollapsed(section)
							? `Toon items in ${section.label}`
							: `Verberg items in ${section.label}`
					"
					@click="toggleSectionCollapse(section.key)"
				>
					<span class="min-w-0 truncate">{{ section.label }}</span>
					<span class="flex shrink-0 items-center gap-2">
						<UBadge
							class="shrink-0 tabular-nums"
							:color="isSectionChecked(section) ? 'success' : 'neutral'"
							variant="subtle"
							size="sm"
							:label="section.itemIds.length"
						/>
						<UIcon
							:name="
								isSectionCollapsed(section)
									? 'i-lucide-chevron-down'
									: 'i-lucide-chevron-up'
							"
							class="size-4 shrink-0"
						/>
					</span>
				</button>
			</div>

			<div
				:key="getSectionRenderKey(section)"
				data-item-container
				class="grid gap-3"
				:class="isSectionCollapsed(section) ? 'hidden' : ''"
			>
				<template v-for="itemId in section.itemIds" :key="`${section.key}:${itemId}`">
					<ItemCard
						v-if="itemById[itemId]"
						:item="itemById[itemId]"
						:data-item-id="itemId"
						@edit="emit('edit', $event)"
						@toggle-checked="emit('toggleChecked', $event)"
					/>
				</template>
				<div
					v-if="section.itemIds.length === 0 && props.items.length > 0"
					class="border-default text-muted min-h-10 rounded-md border border-dashed px-3 py-2 text-sm"
				>
					Sleep items hierheen om deze categorie te gebruiken.
				</div>
			</div>
		</section>
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
