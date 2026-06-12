<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const links = [
	[
		{ label: 'Algemeen', icon: 'i-lucide-settings', to: '/app/settings/general' },
		{ label: 'Huishouden', icon: 'i-lucide-users', to: '/app/settings/household' },
		{ label: 'Itemkluis', icon: 'i-lucide-archive', to: '/app/settings/item-vault' },
		{ label: 'Statistieken', icon: 'i-lucide-chart-column', to: '/app/settings/stats' }
	]
] satisfies NavigationMenuItem[][]
</script>

<template>
	<div class="sticky top-0 z-20">
		<Fluid class="border-default bg-default/95 border-b backdrop-blur">
			<UContainer class="-ml-2 flex overflow-x-auto md:ml-auto">
				<UNavigationMenu :items="links" highlight class="-mx-1 flex-1" />
			</UContainer>
		</Fluid>
	</div>
</template>
