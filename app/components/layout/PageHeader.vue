<script lang="ts" setup>
defineProps<{
	badge?: number | string
}>()
</script>

<template>
	<div class="flex items-start justify-between gap-3">
		<h1 class="text-highlighted min-w-0 text-xl font-semibold text-wrap break-words">
			<slot />
		</h1>
		<div class="flex shrink-0 items-center space-x-2">
			<UBadge v-if="badge || typeof badge === 'number'" color="neutral" variant="subtle">
				{{ badge }}
			</UBadge>
			<slot name="tools" />
		</div>
	</div>
</template>
