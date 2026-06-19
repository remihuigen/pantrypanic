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
	twitterCard: 'summary_large_image',
	robots: 'noindex, nofollow',
	ogImage: '/meta.jpg'
})
</script>

<template>
	<UApp :locale="nl">
		<NuxtPwaManifest />
		<NuxtLayout>
			<NuxtPage />
		</NuxtLayout>
	</UApp>
</template>
