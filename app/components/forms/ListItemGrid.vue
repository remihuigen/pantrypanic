<script setup lang="ts">
import type { ListItem } from '#shared/utils/schemas/domain'
import type { CategorySection } from '~/utils/listItemGrid'

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
const activeDraggedItemId = shallowRef<string | null>(null)
const isItemDragActive = shallowRef(false)
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

function extractPointerCoordinates(
	event: Event | MouseEvent | PointerEvent | TouchEvent | null | undefined
) {
	if (!event) {
		return null
	}

	if ('touches' in event) {
		const touch = event.touches[0] ?? event.changedTouches[0]

		if (!touch) {
			return null
		}

		return { clientX: touch.clientX, clientY: touch.clientY }
	}

	if ('clientX' in event && 'clientY' in event) {
		return { clientX: event.clientX, clientY: event.clientY }
	}

	return null
}

function findHeaderDropSectionKeyAtPoint(clientX: number, clientY: number) {
	const root = itemGridRef.value

	if (!root) {
		return null
	}

	for (const headerDropzone of root.querySelectorAll<HTMLElement>('[data-header-dropzone]')) {
		const rect = headerDropzone.getBoundingClientRect()

		if (
			clientX >= rect.left &&
			clientX <= rect.right &&
			clientY >= rect.top &&
			clientY <= rect.bottom
		) {
			return headerDropzone.dataset.dropSectionKey ?? null
		}
	}

	return null
}

function syncActiveHeaderDropSectionFromEvent(
	event: Event | MouseEvent | PointerEvent | TouchEvent | null | undefined
) {
	const coordinates = extractPointerCoordinates(event)

	if (!coordinates) {
		activeHeaderDropSectionKey.value = null
		return
	}

	activeHeaderDropSectionKey.value = findHeaderDropSectionKeyAtPoint(
		coordinates.clientX,
		coordinates.clientY
	)
}

function handleDragPointerMove(event: Event) {
	if (!isItemDragActive.value) {
		return
	}

	syncActiveHeaderDropSectionFromEvent(event)
}

function startDragState(draggedItemId: string | null) {
	activeDraggedItemId.value = draggedItemId
	isItemDragActive.value = true
	document.addEventListener('pointermove', handleDragPointerMove, { passive: true })
	document.addEventListener('touchmove', handleDragPointerMove, { passive: true })
}

function commitHeaderDrop() {
	if (!activeDraggedItemId.value || !activeHeaderDropSectionKey.value) {
		return false
	}

	renderedSections.value = moveItemToSectionTail(
		renderedSections.value,
		activeDraggedItemId.value,
		activeHeaderDropSectionKey.value
	)

	return true
}

function clearDragState() {
	document.removeEventListener('pointermove', handleDragPointerMove)
	document.removeEventListener('touchmove', handleDragPointerMove)
	activeHeaderDropSectionKey.value = null
	activeDraggedItemId.value = null
	isItemDragActive.value = false
}

function destroySortables() {
	for (const sortable of itemSortables.value) {
		sortable.destroy()
	}

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
				onChoose: (event) => {
					startDragState(event.item.dataset.itemId ?? null)
				},
				onMove: (event) => {
					syncActiveHeaderDropSectionFromEvent((event as { originalEvent?: Event }).originalEvent)
					return true
				},
				touchStartThreshold: 4,
				onEnd: () => {
					const didCommitHeaderDrop = commitHeaderDrop()
					clearDragState()

					if (didCommitHeaderDrop) {
						void emitCategorizedReorder()
						return
					}

					void emitCategorizedReorder()
				}
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
				class="list-item-grid__section-header relative min-h-9 rounded-md text-xs font-semibold tracking-normal uppercase"
				:class="[
					isSectionChecked(section) ? 'text-success opacity-50' : 'text-muted',
					activeHeaderDropSectionKey === section.key ? 'bg-elevated/40' : ''
				]"
			>
				<div
					:data-drop-section-key="section.key"
					:class="isItemDragActive ? 'pointer-events-auto' : 'pointer-events-none'"
					class="list-item-grid__header-dropzone absolute inset-0 z-20 rounded-md"
					data-header-dropzone
				/>
				<div
					class="relative z-10 flex min-h-9 items-center px-1 pt-2 pb-1 transition-transform duration-150"
					:class="activeHeaderDropSectionKey === section.key ? 'translate-x-0.5' : ''"
				>
					<button
						type="button"
						class="list-item-grid__section-handle text-muted flex items-center overflow-hidden transition-all duration-200 ease-out"
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
						class="flex min-w-0 flex-1 items-center justify-between gap-2 text-left"
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

				<USeparator
					class="pointer-events-none absolute inset-x-0 bottom-0"
					color="neutral"
					decorative
				/>
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
