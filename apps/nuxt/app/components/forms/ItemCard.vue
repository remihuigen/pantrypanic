<script setup lang="ts">
import type { ListItem } from '#shared/utils/schemas/domain'
import { getIcon } from '#shared/utils/icons'

import { useGesture } from '@vueuse/gesture'

const props = defineProps<{
	item: ListItem
}>()

const emit = defineEmits<{
	edit: [listItemId: string]
	toggleChecked: [listItemId: string]
}>()

const gestureTarget = useTemplateRef<HTMLElement>('gestureTarget')
const ignoreNextClick = shallowRef(false)
const isDraggingSwipe = shallowRef(false)
const swipeOffsetX = shallowRef(0)

const SWIPE_ACTION_DISTANCE = 40
const MIN_DRAG_DISTANCE = 4

const amountLabel = computed(() =>
	props.item.amount
		? [props.item.amount, props.item.unit?.toLowerCase()]
				.filter((value) => value !== undefined && String(value).trim().length > 0)
				.join(' ')
		: ''
)
const hasNote = computed(() => Boolean(props.item.note?.trim()))
const swipeProgress = computed(() => Math.abs(swipeOffsetX.value) / SWIPE_ACTION_DISTANCE)
const swipeColor = computed(() => (props.item.status === 'checked' ? '59 130 246' : '34 197 94'))
const cardStyle = computed(() => {
	const easedProgress = 1 - Math.pow(1 - swipeProgress.value, 2)
	const colorOpacity = swipeProgress.value > 0 ? 0.08 + easedProgress * 0.22 : 0
	const borderOpacity = swipeProgress.value > 0 ? 0.32 + easedProgress * 0.38 : 0
	const shadowOpacity = swipeProgress.value > 0 ? 0.18 + easedProgress * 0.28 : 0
	const opacity =
		props.item.status === 'checked' ? 0.5 + easedProgress * 0.35 : 1 - easedProgress * 0.08

	return {
		transform: `translate3d(${swipeOffsetX.value}px, 0, 0)`,
		backgroundColor:
			colorOpacity > 0 ? `rgb(${swipeColor.value} / ${colorOpacity})` : undefined,
		borderColor: borderOpacity > 0 ? `rgb(${swipeColor.value} / ${borderOpacity})` : undefined,
		boxShadow:
			shadowOpacity > 0 ? `0 0 0 1px rgb(${swipeColor.value} / ${shadowOpacity})` : undefined,
		opacity,
		transition: isDraggingSwipe.value
			? 'background-color 60ms linear, border-color 60ms linear, box-shadow 60ms linear, opacity 60ms linear, transform 60ms linear'
			: 'background-color 180ms ease, border-color 180ms ease, box-shadow 180ms ease, opacity 180ms ease, transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1)'
	}
})

function handleEdit() {
	if (ignoreNextClick.value) {
		ignoreNextClick.value = false
		return
	}

	emit('edit', props.item.id)
}

function clampSwipeOffset(movementX: number) {
	return Math.min(0, Math.max(-SWIPE_ACTION_DISTANCE, movementX))
}

function isSortableDragEvent(event: Event) {
	return (
		event.target instanceof Element &&
		Boolean(event.target.closest('.sortable-chosen, .sortable-drag, .sortable-ghost'))
	)
}

function suppressNextClick() {
	ignoreNextClick.value = true
	setTimeout(() => {
		ignoreNextClick.value = false
	}, 0)
}

function resetSwipeMotion() {
	isDraggingSwipe.value = false
	swipeOffsetX.value = 0
}

useGesture(
	{
		onDrag: ({ event, movement: [movementX], tap }) => {
			if (tap || isSortableDragEvent(event)) {
				resetSwipeMotion()
				return
			}

			isDraggingSwipe.value = true
			swipeOffsetX.value = clampSwipeOffset(movementX)
		},
		onDragEnd: ({ event, movement: [movementX], tap }) => {
			if (tap || isSortableDragEvent(event)) {
				resetSwipeMotion()
				return
			}

			if (Math.abs(movementX) > MIN_DRAG_DISTANCE) {
				suppressNextClick()
			}

			if (movementX <= -SWIPE_ACTION_DISTANCE) {
				emit('toggleChecked', props.item.id)
			}

			resetSwipeMotion()
		}
	},
	{
		domTarget: gestureTarget,
		drag: {
			axis: 'x',
			filterTaps: true,
			swipeDistance: SWIPE_ACTION_DISTANCE,
			threshold: [MIN_DRAG_DISTANCE, 0]
		}
	}
)
</script>

<template>
	<div
		ref="gestureTarget"
		role="button"
		tabindex="0"
		class="item-card touch-pan-y"
		@click="handleEdit"
		@keydown.enter.prevent="handleEdit"
		@keydown.space.prevent="handleEdit"
	>
		<UCard
			class="will-change-transform select-none"
			variant="outline"
			:style="cardStyle"
			:ui="{
				body: 'p-3 sm:p-3',
				root:
					item.status === 'checked'
						? 'ring-success dark:ring-success-700 bg-success-50 dark:bg-success-900/20 opacity-50'
						: 'ring-default'
			}"
		>
			<div class="flex min-w-0 items-center gap-3">
				<UIcon
					:name="getIcon('gripVertical')"
					class="item-card__drag-handle text-muted size-4 shrink-0 cursor-grab touch-none"
					@click.stop
				/>
				<span class="text-highlighted min-w-0 grow truncate text-sm font-medium">
					{{ props.item.name }}
				</span>
				<span class="text-muted shrink-0 text-xs">
					{{ amountLabel }}
				</span>
				<UIcon
					v-if="hasNote"
					:name="getIcon('info')"
					class="text-muted size-3.5 shrink-0"
					aria-label="Heeft notitie"
				/>
			</div>
		</UCard>
	</div>
</template>
