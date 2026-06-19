<script setup lang="ts">
import { getIcon } from '#shared/utils/icons'

const searchQuery = defineModel<string>('searchQuery', { default: '' })

const emit = defineEmits<{
	create: []
}>()
</script>

<template>
	<div class="flex items-stretch gap-2">
		<UInput
			v-model="searchQuery"
			:icon="getIcon('search')"
			placeholder="Zoek recepten"
			size="xl"
			class="min-w-0 flex-1"
			:ui="{ root: 'w-full' }"
		/>
		<UButton
			color="primary"
			size="xl"
			variant="subtle"
			:icon="getIcon('plus')"
			class="text-sm"
			:ui="{ leadingIcon: 'size-4' }"
			@click="emit('create')"
		>
			Nieuw
		</UButton>
	</div>
</template>
