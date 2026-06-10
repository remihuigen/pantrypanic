<script setup lang="ts">
const props = defineProps<{
	listId: string
	name: string
	icon?: string
	itemCount: number
	canDelete: boolean
}>()

const emit = defineEmits<{
	delete: [listId: string]
	editSettings: [listId: string]
}>()

const menuItems = computed(() => [
	[
		{
			label: 'Wijzig instellingen',
			icon: 'i-lucide-settings',
			onSelect: () => {
				emit('editSettings', props.listId)
			}
		},
		{
			label: 'Verwijderen',
			icon: 'i-lucide-trash-2',
			disabled: !props.canDelete,
			onSelect: () => {
				emit('delete', props.listId)
			}
		}
	]
])

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

		<UDropdownMenu :items="menuItems" :content="{ align: 'end' }">
			<UButton
				variant="ghost"
				color="neutral"
				square
				size="sm"
				class="list-card__menu absolute top-2 right-2 z-10"
				icon="i-lucide-ellipsis-vertical"
				aria-label="Acties"
				@click.stop
			/>
		</UDropdownMenu>

		<NuxtLink :to="`/lists/${props.listId}`" class="block pe-10 pt-6 pb-1">
			<p class="text-highlighted text-base leading-tight font-semibold">
				{{ props.name }}
			</p>
			<p class="text-muted mt-2 text-sm">{{ props.itemCount }} {{ itemLabel }}</p>
		</NuxtLink>
	</UCard>
</template>
