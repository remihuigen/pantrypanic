<script setup lang="ts">
const props = defineProps<{
	listId: string
	name: string
	icon?: string
	itemCount: number
	canDelete: boolean
}>()

const itemLabel = computed(() => (props.itemCount === 1 ? 'item' : 'items'))
const leadingIcon = computed(() =>
	props.icon && props.icon.trim().length > 0 ? props.icon : 'i-lucide-grip-vertical'
)
</script>

<template>
	<UCard class="list-card relative h-full">
		<div class="text-muted list-card__drag-handle absolute top-3 left-4 cursor-grab">
			<UIcon :name="leadingIcon" class="size-4" />
		</div>

		<ListActionMenu
			class="absolute top-2 right-1 z-10"
			:list-id="props.listId"
			:can-delete="props.canDelete"
		/>

		<NuxtLink :to="`/lists/${props.listId}`" class="block pe-10 pt-6 pb-1">
			<p class="text-highlighted text-base leading-tight font-semibold">
				{{ props.name }}
			</p>
			<p class="text-muted mt-2 text-sm">{{ props.itemCount }} {{ itemLabel }}</p>
		</NuxtLink>
	</UCard>
</template>
