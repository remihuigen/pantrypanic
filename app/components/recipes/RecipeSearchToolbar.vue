<script setup lang="ts">
const searchQuery = defineModel<string>('searchQuery', { default: '' })

const emit = defineEmits<{
	create: []
}>()
</script>

<template>
	<div class="flex items-stretch gap-2">
		<UInput
			v-model="searchQuery"
			icon="i-lucide-search"
			placeholder="Zoek recepten"
			size="xl"
			class="min-w-0 flex-1"
			:ui="{ root: 'w-full' }"
		/>
		<UButton
			color="primary"
			size="xl"
			variant="subtle"
			icon="i-lucide-plus"
			class="text-sm"
			:ui="{ leadingIcon: 'size-4' }"
			@click="emit('create')"
		>
			Nieuw
		</UButton>
	</div>
</template>
