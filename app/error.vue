<script lang="ts" setup>
import type { NuxtError } from '#app'

import { nl } from '@nuxt/ui/locale'

useHead({
	meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }],
	link: [{ rel: 'icon', href: '/favicon.ico' }],
	htmlAttrs: {
		lang: 'nl'
	}
})

defineProps<{
	error: NuxtError
}>()

const { staggerMotion } = useMotion()
</script>

<template>
	<UApp :locale="nl">
		<div class="flex min-h-screen grow flex-col">
			<UHeader :toggle="false">
				<template #left>
					<NuxtLink to="/">
						<AppLogo class="h-9 w-auto shrink-0" />
					</NuxtLink>
				</template>

				<template #right>
					<UColorModeButton />
				</template>
			</UHeader>

			<UMain class="flex min-h-auto grow flex-col justify-center">
				<Motion v-bind="staggerMotion(0)">
					<HeroShaders
						class="absolute inset-x-0 top-0 h-[130vh] opacity-30 dark:opacity-25"
					/>
				</Motion>
				<UError :error="error" class="relative" />
			</UMain>

			<Footer />
		</div>
	</UApp>
</template>
