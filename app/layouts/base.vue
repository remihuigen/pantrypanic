<script lang="ts" setup>
import type { NavigationMenuItem } from '@nuxt/ui'

import { getIcon } from '#shared/utils/icons'

withDefaults(defineProps<{ useShaders?: boolean }>(), { useShaders: true })

const { loggedIn } = useUserSession()

const { enableBetaPeriod, enableMarketing } = useRuntimeConfig().public

const items = computed<NavigationMenuItem[]>(() => {
	const menu: NavigationMenuItem[] = []

	if (enableMarketing) {
		menu.push({
			label: 'Blog',
			to: '/blog',
			icon: getIcon('blog')
		})
	}

	if (loggedIn.value) {
		menu.push({
			label: 'Open app',
			to: '/app',
			icon: getIcon('login')
		})
	} else {
		menu.push({
			label: 'Sign in',
			to: '/login',
			icon: getIcon('login')
		})
	}

	return menu
})
</script>

<template>
	<div class="flex min-h-screen grow flex-col">
		<UHeader :ui="{ right: 'space-x-2' }">
			<template #left>
				<NuxtLink to="/" class="relative -top-0.75">
					<AppLogo class="h-9 w-auto shrink-0" />
				</NuxtLink>
				<UBadge
					v-if="enableBetaPeriod"
					color="neutral"
					variant="soft"
					label="beta"
					size="sm"
					class="bg-success-50! relative top-0.5 ml-3 gap-1.5 rounded-full bg-white/5 px-2 py-1 backdrop-blur select-none dark:bg-neutral-800!"
				>
					<template #leading>
						<UChip
							inset
							standalone
							color="success"
							:ui="{ base: 'animate-pulse ring-0' }"
						/>
					</template>
				</UBadge>
			</template>

			<template #right>
				<UNavigationMenu
					:items="items"
					class="hidden lg:flex"
					:ui="{ list: 'space-x-2' }"
				/>
				<UButton label="Free trial" to="/register" class="hidden md:flex" />
				<UColorModeButton />
			</template>

			<template #body>
				<UNavigationMenu
					:items="items"
					orientation="vertical"
					:ui="{ list: 'space-y-2' }"
				/>
				<UButton label="Free trial" to="/register" block class="mt-5" />
			</template>
		</UHeader>

		<UMain class="flex min-h-auto grow flex-col justify-center">
			<div class="absolute inset-x-0 top-0 max-h-screen overflow-hidden">
				<HeroShaders v-if="useShaders" class="h-[130vh] opacity-30 dark:opacity-25" />
			</div>

			<NuxtPage />
		</UMain>

		<Footer />
	</div>
</template>
