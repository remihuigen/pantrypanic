<script setup lang="ts">
const route = useRoute()

const links = [
	{ label: 'Algemeen', icon: 'i-lucide-settings', to: '/app/settings' },
	{ label: 'Huishouden', icon: 'i-lucide-users', to: '/app/settings/household' },
	{ label: 'Itemkluis', icon: 'i-lucide-archive', to: '/app/settings/item-valut' },
	{ label: 'Statistieken', icon: 'i-lucide-chart-column', to: '/app/settings/stats' }
]

function isActive(path: string) {
	return path === '/app/settings' ? route.path === path : route.path.startsWith(path)
}
</script>

<template>
	<div class="flex gap-2 overflow-x-auto pb-1">
		<UButton
			v-for="link in links"
			:key="link.to"
			:to="link.to"
			:icon="link.icon"
			:color="isActive(link.to) ? 'primary' : 'neutral'"
			:variant="isActive(link.to) ? 'solid' : 'ghost'"
			size="sm"
		>
			{{ link.label }}
		</UButton>
	</div>
</template>
