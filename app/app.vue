<script lang="ts" setup>
import { nl } from '@nuxt/ui/locale'

useHead({
	meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }],
	link: [{ rel: 'icon', href: '/favicon.ico' }],
	htmlAttrs: {
		lang: 'nl'
	}
})

const { identity } = useRuntimeConfig().public

const title = identity.title
const description = identity.description

useSeoMeta({
	title,
	description,
	ogTitle: title,
	ogDescription: description,
	twitterCard: 'summary_large_image'
})
</script>

<template>
	<UApp :locale="nl">
		<div class="flex min-h-screen flex-col">
			<NuxtLayout>
				<NuxtPage />
			</NuxtLayout>

			<USeparator
				:avatar="{
					src: '/separator_icon.png',
					size: 'lg',
					class: 'object-contain',
					ui: { root: 'bg-transparent' }
				}"
			/>

			<UFooter :ui="{ root: 'mb-3' }">
				<template #left>
					<p class="text-muted text-sm">
						{{ identity.title }} • © {{ new Date().getFullYear() }}
					</p>
				</template>
				<template #right>
					<p class="text-muted text-sm">{{ identity.description }}</p>
				</template>
			</UFooter>
		</div>
	</UApp>
</template>
