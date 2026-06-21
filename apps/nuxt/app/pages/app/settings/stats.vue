<script lang="ts" setup>
import { getIcon } from '#shared/utils/icons'

const settingsStore = useSettingsStore()
const toast = useToast()
const isLoadingStats = ref(false)
const showStatsSkeleton = computed(
	() => (isLoadingStats.value || settingsStore.isLoading) && !settingsStore.stats
)

onMounted(async () => {
	isLoadingStats.value = true

	try {
		await settingsStore.fetchHouseholds()
		if (!settingsStore.activeHouseholdId) return
		await settingsStore.fetchStats()
	} catch (error) {
		toast.add({
			title:
				error && typeof error === 'object' && 'message' in error
					? String((error as { message?: string }).message)
					: 'Statistieken konden niet worden geladen.',
			color: 'error',
			icon: getIcon('error')
		})
	} finally {
		isLoadingStats.value = false
	}
})
</script>

<template>
	<div class="space-y-4">
		<div v-if="showStatsSkeleton" class="space-y-4">
			<USkeleton class="h-9 w-40" />
			<UPageCard variant="subtle" :ui="{ body: 'space-y-4' }">
				<div class="grid grid-cols-2 gap-3 sm:grid-cols-5">
					<USkeleton class="h-20 w-full rounded-xl" />
					<USkeleton class="h-20 w-full rounded-xl" />
					<USkeleton class="h-20 w-full rounded-xl" />
					<USkeleton class="h-20 w-full rounded-xl" />
					<USkeleton class="h-20 w-full rounded-xl" />
				</div>
				<div class="space-y-2">
					<USkeleton class="h-5 w-40" />
					<USkeleton class="h-4 w-full" />
					<USkeleton class="h-4 w-5/6" />
					<USkeleton class="h-4 w-2/3" />
				</div>
			</UPageCard>
		</div>

		<SettingsStatsSection v-else-if="settingsStore.activeHouseholdId" />
	</div>
</template>
