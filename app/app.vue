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

const { $pwa } = useNuxtApp()

const toast = useToast()
const { getIcon } = useIcon()

const installToastShown = shallowRef<boolean>(false)

const installApp = async (): Promise<void> => {
	if (!$pwa?.showInstallPrompt) return

	await $pwa.install()
}

const dismissInstallPrompt = (): void => {
	$pwa?.cancelInstall()
}

watch(
	() => $pwa?.needRefresh,
	(needRefresh) => {
		if (!needRefresh) return

		toast.add({
			icon: getIcon('new'),
			title: 'Een nieuwe versie van de app staat klaar',
			color: 'primary',
			duration: 12000,
			actions: [
				{
					label: 'Updaten',
					color: 'primary',
					icon: getIcon('download'),
					onClick: () => $pwa?.updateServiceWorker()
				},
				{
					label: 'Niet nu',
					color: 'neutral',
					variant: 'ghost',
					onClick: () => $pwa?.cancelPrompt()
				}
			]
		})
	},
	{
		immediate: true
	}
)

watch(
	() => $pwa?.showInstallPrompt,
	(showInstallPrompt) => {
		if (!showInstallPrompt || installToastShown.value) return

		installToastShown.value = true

		toast.add({
			icon: getIcon('download'),
			title: 'Installeer Pantry Panic',
			color: 'primary',
			duration: 12000,
			actions: [
				{
					label: 'Installeren',
					color: 'primary',
					icon: getIcon('download'),
					onClick: installApp
				},
				{
					label: 'Niet nu',
					color: 'neutral',
					variant: 'ghost',
					onClick: dismissInstallPrompt
				}
			]
		})
	},
	{
		immediate: true
	}
)
</script>

<template>
	<UApp :locale="nl">
		<NuxtPwaManifest />
		<NuxtLayout>
			<NuxtPage />
		</NuxtLayout>
	</UApp>
</template>
