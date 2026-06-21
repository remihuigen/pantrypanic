<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import { getIcon } from '#shared/utils/icons'

const links = [
	[
		{ label: 'Algemeen', icon: getIcon('settings'), to: '/app/settings/general' },
		{ label: 'Huishouden', icon: getIcon('users'), to: '/app/settings/household' },
		{ label: 'Itemkluis', icon: getIcon('archive'), to: '/app/settings/item-vault' },
		{ label: 'Categorieen', icon: getIcon('tags'), to: '/app/settings/categories' },
		{ label: 'Statistieken', icon: getIcon('chartColumn'), to: '/app/settings/stats' }
	]
] satisfies NavigationMenuItem[][]
</script>

<template>
	<div class="sticky top-0 z-20">
		<Fluid class="border-default bg-default/95 border-b backdrop-blur">
			<UContainer class="-ml-2 flex max-w-2xl overflow-x-auto md:ml-auto">
				<UNavigationMenu :items="links" highlight class="-mx-1 flex-1" />
			</UContainer>
		</Fluid>
	</div>
</template>
