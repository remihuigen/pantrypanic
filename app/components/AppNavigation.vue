<script lang="ts" setup>
import type { ButtonProps } from '@nuxt/ui'

const route = useRoute()

const leftContainer: ButtonProps[] = [
	{
		name: 'Lijsten',
		to: '/',
		icon: 'lucide:list'
	},
	{
		name: 'Meal Planner',
		to: '/meal-planner',
		icon: 'lucide:utensils'
	}
]

const rightContainer: ButtonProps[] = [
	{
		name: 'Recepten',
		to: '/recipes',
		icon: 'lucide:book'
	},
	{
		name: 'Instellingen',
		to: '/settings',
		icon: 'lucide:settings'
	}
]

function isActive(btn: ButtonProps) {
	return route.path === btn.to
}
</script>

<template>
	<nav
		class="border-elevated/50 bg-default border-default fixed right-0 bottom-0 left-0 grid h-18 border-t shadow-2xl"
	>
		<div class="relative flex items-center justify-center gap-3 px-4">
			<UButton
				v-for="btn in leftContainer"
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
				icon="lucide:plus"
				size="xl"
			/>
			<UButton
				v-for="btn in rightContainer"
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
