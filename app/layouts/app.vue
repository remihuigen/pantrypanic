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
	<div class="pb-20">
		<EditItemDrawer />
		<EditListDrawer />
		<AppNavigation class="z-10" />
		<UContainer class="flex min-h-screen flex-col">
			<AppHouseholdGate
				v-if="resolvedHouseholdState && settingsStore.hasNoHousehold"
			/>
			<div v-else-if="!resolvedHouseholdState" class="py-8">
				<USkeleton class="h-40 w-full" />
			</div>
			<slot v-else />
		</UContainer>
		<Footer />
	</div>
</template>
