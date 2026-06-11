<script lang="ts" setup>
const { $pwa } = useNuxtApp()

const toast = useToast()
const { getIcon } = useIcon()

onMounted(async () => {
	if (!$pwa) return

	if ($pwa.showInstallPrompt) {
		await $pwa.install()
	}
})
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
