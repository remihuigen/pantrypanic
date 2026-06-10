<script lang="ts" setup>
const { identity } = useRuntimeConfig().public
</script>

<template>
	<USeparator
		:avatar="{
			src: '/separator_icon.png',
			size: 'lg',
			class: 'object-contain',
			ui: { root: 'bg-transparent' }
		}"
	/>
	<UFooter :ui="{ root: 'mb-3' }">
		<template #left>
			<p class="text-muted text-sm">
				{{ identity.title }} • © {{ new Date().getFullYear() }}
			</p>
		</template>
		<template #right>
			<p class="text-muted text-sm">{{ identity.description }}</p>
		</template>
	</UFooter>
</template>
