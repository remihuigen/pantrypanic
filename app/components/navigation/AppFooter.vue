<script lang="ts" setup>
const { identity } = useRuntimeConfig().public
</script>

<template>
	<USeparator>
		<AppIcon class="w-6" />
	</USeparator>
	<UFooter
		:ui="{
			root: 'mb-3',
			right: 'space-x-4'
		}"
	>
		<template #left>
			<p class="text-muted text-sm">
				{{ identity.title }} • © {{ new Date().getFullYear() }}
			</p>
		</template>
		<template #right>
			<p class="text-muted text-sm">{{ identity.description }}</p>
			<UButton
				to="https://github.com/remihuigen/pantrypanic"
				icon="mdi:github"
				variant="ghost"
				color="neutral"
			/>
		</template>
	</UFooter>
</template>
