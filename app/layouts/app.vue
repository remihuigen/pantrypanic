<script lang="ts" setup>
const { $pwa } = useNuxtApp()

const toast = useToast()
const { getIcon } = useIcon()

const installToastShown = ref<boolean>(false)

/**
 * Shows the PWA install prompt.
 *
 * @returns Promise resolving when the browser install flow has completed.
 */
const installApp = async (): Promise<void> => {
	if (!$pwa?.showInstallPrompt) return

	await $pwa.install()
}

/**
 * Dismisses the current PWA install prompt.
 *
 * @returns Promise resolving when the prompt has been cancelled.
 */
const dismissInstallPrompt = async (): Promise<void> => {
	if (!$pwa) return

	await $pwa.cancelPrompt()
}

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
	<div class="pb-20">
		<EditItemDrawer />
		<EditListDrawer />
		<AppNavigation class="z-10" />
		<UContainer class="flex min-h-screen flex-col">
			<slot />
		</UContainer>
		<Footer />
	</div>
</template>
