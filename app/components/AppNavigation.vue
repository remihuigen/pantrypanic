<script lang="ts" setup>
import type { ButtonProps } from '@nuxt/ui'

import { useEditItemDrawer } from '~/composables/useEditItemDrawer'

const route = useRoute()
const editItemDrawer = useEditItemDrawer()
const { getIcon } = useIcon()

const leftContainer: ButtonProps[] = [
	{
		name: 'Lijsten',
		to: '/lists',
		icon: getIcon('list')
	},
	{
		name: 'Meal Planner',
		to: '/meal-planner',
		icon: getIcon('planner')
	}
]

const rightContainer: ButtonProps[] = [
	{
		name: 'Recepten',
		to: '/recipes',
		icon: getIcon('recipe')
	},
	{
		name: 'Instellingen',
		to: '/settings',
		icon: getIcon('settings')
	}
]

function isActive(btn: ButtonProps) {
	return route.path.startsWith(String(btn.to))
}

function openCreateItemDrawer() {
	editItemDrawer.open({ mode: 'create' })
}
</script>

<template>
	<nav
		class="border-elevated/50 bg-default border-default fixed right-0 bottom-0 left-0 grid h-18 border-t shadow-2xl"
	>
		<div class="relative flex items-center justify-center gap-3 px-4">
			<UButton
				v-for="btn in leftContainer"
				:key="`left-${btn.to}`"
				:color="isActive(btn) ? 'primary' : 'neutral'"
				variant="ghost"
				:icon="btn.icon"
				:to="btn.to"
				size="xl"
				block
				class="aspect-square grow transition-all"
				:class="isActive(btn) ? '-translate-y-0.5' : ''"
			/>
			<UButton
				class="mx-4 shrink-0 -translate-y-[calc(50%+8px)] rounded-full p-4"
				color="primary"
				:icon="getIcon('plus')"
				size="xl"
				@click="openCreateItemDrawer"
			/>
			<UButton
				v-for="btn in rightContainer"
				:key="`right-${btn.to}`"
				:color="isActive(btn) ? 'primary' : 'neutral'"
				variant="ghost"
				:icon="btn.icon"
				:to="btn.to"
				size="xl"
				block
				class="aspect-square grow transition-all"
				:class="isActive(btn) ? '-translate-y-0.5' : ''"
			/>
		</div>
	</nav>
</template>
