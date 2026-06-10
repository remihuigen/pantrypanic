<script setup lang="ts">
import type { ListItem } from '#shared/utils/schemas/domain'

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

const amountLabel = computed(() =>
	[props.item.amount, props.item.unit]
		.filter((value) => value !== undefined && String(value).trim().length > 0)
		.join(' ')
)

function handleEdit() {
	if (ignoreNextClick.value) {
		ignoreNextClick.value = false
		return
	}

	emit('edit', props.item.id)
}

useGesture(
	{
		onDragEnd: ({ swipe: [swipeX] }) => {
			if (swipeX >= 0) {
				return
			}

			ignoreNextClick.value = true
			emit('toggleChecked', props.item.id)
			setTimeout(() => {
				ignoreNextClick.value = false
			}, 0)
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
	<div
		ref="gestureTarget"
		role="button"
		tabindex="0"
		class="item-card cursor-grab touch-pan-y"
		@click="handleEdit"
		@keydown.enter.prevent="handleEdit"
		@keydown.space.prevent="handleEdit"
	>
		<UCard
			class="transition-[ring,opacity]"
			variant="outline"
			:ui="{
				body: 'p-3 sm:p-3',
				root:
					item.status === 'checked'
						? 'ring-success dark:ring-success-700 bg-success-50 dark:bg-success-900/20 opacity-50'
						: 'ring-default'
			}"
		>
			<div class="flex min-w-0 items-center gap-3">
				<UIcon name="i-lucide-grip-vertical" class="text-muted size-4 shrink-0" />
				<span class="text-highlighted min-w-0 grow truncate text-sm font-medium">
					{{ props.item.name }}
				</span>
				<span class="text-muted shrink-0 text-xs">
					{{ amountLabel }}
				</span>
			</div>
		</UCard>
	</div>
</template>
