<script lang="ts" setup>
import type { ButtonProps, NavigationMenuItem } from '@nuxt/ui'

import { getIcon } from '#shared/utils/icons'
import { useEditItemDrawer } from '~/composables/useEditItemDrawer'

const route = useRoute()
const editItemDrawer = useEditItemDrawer()
const { enableMarketing } = useRuntimeConfig().public

type MenuItem = Pick<ButtonProps, 'name' | 'to' | 'icon'>

const leftContainer: MenuItem[] = [
	{
		name: 'Lijsten',
		to: '/app/lists',
		icon: getIcon('list')
	},
	{
		name: 'Weekplanner',
		to: '/app/meal-planner',
		icon: getIcon('planner')
	}
]

const rightContainer: MenuItem[] = [
	{
		name: 'Recepten',
		to: '/app/recipes',
		icon: getIcon('recipe')
	},
	{
		name: 'Instellingen',
		to: '/app/settings',
		icon: getIcon('settings')
	}
]

function isActive(btn: ButtonProps) {
	return route.path.startsWith(String(btn.to))
}

function openCreateItemDrawer() {
	editItemDrawer.open({ mode: 'create' })
}

const desktopNavigation: NavigationMenuItem[][] = [
	[...leftContainer, ...rightContainer].map((btn) => ({
		...btn,
		label: btn.name
	}))
]
</script>

<template>
	<UHeader :toggle="false" class="hidden lg:flex">
		<template #left>
			<NuxtLink :to="enableMarketing ? '/' : '/app'">
				<AppLogo class="h-9 w-auto shrink-0" />
			</NuxtLink>
		</template>
		<UNavigationMenu :items="desktopNavigation" class="w-full" :ui="{ list: 'gap-4' }" />
		<template #right>
			<UButton
				label="Nieuw item"
				:icon="getIcon('plus')"
				color="primary"
				@click="openCreateItemDrawer"
			/>
		</template>
	</UHeader>
	<nav
		class="border-elevated/50 bg-default border-default fixed right-0 bottom-0 left-0 z-40 grid h-18 border-t py-2 shadow-2xl lg:hidden"
	>
		<div class="relative flex items-center justify-center gap-3 px-4">
			<div class="relative grid h-full grid-cols-2 gap-4">
				<UButton
					v-for="btn in leftContainer"
					:key="`left-${btn.to}`"
					:color="isActive(btn) ? 'primary' : 'neutral'"
					variant="ghost"
					:icon="btn.icon"
					:to="btn.to"
					size="xl"
					block
					class="aspect-square h-full bg-transparent! transition-all"
					:class="isActive(btn) ? '-translate-y-0.5' : ''"
				/>
			</div>

			<div class="relative h-full px-4">
				<UButton
					class="shrink-0 -translate-y-[calc(50%+0.5rem)] rounded-full p-4"
					color="primary"
					:icon="getIcon('plus')"
					size="xl"
					@click="openCreateItemDrawer"
				/>
			</div>
			<div class="relative grid h-full grid-cols-2 gap-4">
				<UButton
					v-for="btn in rightContainer"
					:key="`right-${btn.to}`"
					:color="isActive(btn) ? 'primary' : 'neutral'"
					variant="ghost"
					:icon="btn.icon"
					:to="btn.to"
					size="xl"
					block
					class="aspect-square bg-transparent! transition-all"
					:class="isActive(btn) ? '-translate-y-0.5' : ''"
				/>
			</div>
		</div>
	</nav>
</template>
