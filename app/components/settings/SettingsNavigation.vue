<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const links = [
	[
		{ label: 'Algemeen', icon: 'i-lucide-settings', to: '/app/settings' },
		{ label: 'Huishouden', icon: 'i-lucide-users', to: '/app/settings/household' },
		{ label: 'Itemkluis', icon: 'i-lucide-archive', to: '/app/settings/item-vault' },
		{ label: 'Statistieken', icon: 'i-lucide-chart-column', to: '/app/settings/stats' }
	]
] satisfies NavigationMenuItem[][]
</script>

<template>
	<Fluid class="border-default flex overflow-x-auto border-b pb-1 pl-2">
		<UNavigationMenu :items="links" highlight class="-mx-1 flex-1" />
	</Fluid>
</template>
