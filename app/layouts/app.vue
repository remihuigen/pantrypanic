<script setup lang="ts">
const settingsStore = useSettingsStore()
const resolvedHouseholdState = ref(false)

onMounted(async () => {
	try {
		await Promise.all([settingsStore.fetchProfile(), settingsStore.fetchHouseholds()])
	} finally {
		resolvedHouseholdState.value = true
	}
})

const { $pwa } = useNuxtApp()
const toast = useToast()
const installToastShown = shallowRef<boolean>(false)
const { canShowInstallPrompt, dismissInstallPrompt, installApp } = usePwaInstallPrompt()

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
	canShowInstallPrompt,
	(canShowPrompt) => {
		if (!canShowPrompt || installToastShown.value) return

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
	<div class="pb-20 lg:pb-0">
		<EditItemDrawer />
		<EditListDrawer />
		<AppNavigation class="z-10" />
		<UContainer class="mx-auto flex min-h-screen max-w-2xl flex-col">
			<AppHouseholdGate v-if="resolvedHouseholdState && settingsStore.hasNoHousehold" />
			<slot v-else />
		</UContainer>
		<Footer />
	</div>
</template>
