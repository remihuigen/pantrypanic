<script setup lang="ts">
import type { RecipeItem } from '#shared/utils/schemas/domain'

const props = defineProps<{
	item: RecipeItem
}>()

const emit = defineEmits<{
	edit: [recipeItemId: string]
}>()

const amountLabel = computed(() =>
	props.item.amount
		? [props.item.amount, props.item.unit?.toLowerCase()]
				.filter((value) => value !== undefined && String(value).trim().length > 0)
				.join(' ')
		: ''
)
</script>

<template>
	<div
		role="button"
		tabindex="0"
		class="recipe-item-card"
		@click="emit('edit', props.item.id)"
		@keydown.enter.prevent="emit('edit', props.item.id)"
		@keydown.space.prevent="emit('edit', props.item.id)"
	>
		<UCard
			class="transition hover:ring-primary/40"
			variant="outline"
			:ui="{ body: 'p-3 sm:p-3', root: 'ring-default' }"
		>
			<div class="flex min-w-0 items-center gap-3">
				<UIcon
					name="i-lucide-grip-vertical"
					class="recipe-item-card__drag-handle text-muted size-4 shrink-0 cursor-grab touch-none"
					@click.stop
				/>
				<div class="min-w-0 grow">
					<p class="text-highlighted truncate text-sm font-medium">{{ props.item.name }}</p>
					<p v-if="props.item.note" class="text-muted mt-0.5 truncate text-xs">
						{{ props.item.note }}
					</p>
				</div>
				<span class="text-muted shrink-0 text-xs">
					{{ amountLabel }}
				</span>
			</div>
		</UCard>
	</div>
</template>
