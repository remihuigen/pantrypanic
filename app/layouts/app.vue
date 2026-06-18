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
