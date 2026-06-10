<script lang="ts" setup>
defineProps<{
	badge?: number | string
}>()
</script>

<template>
	<div class="flex items-center justify-between">
		<h1 class="text-highlighted text-xl font-semibold"><slot /></h1>
		<UBadge v-if="badge || typeof badge === 'number'" color="neutral" variant="subtle">
			{{ badge }}
		</UBadge>
	</div>
</template>
