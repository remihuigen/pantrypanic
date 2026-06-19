<script lang="ts" setup>
definePageMeta({ layout: 'app' })

const mealPlannerStore = useMealPlannerStore()
const showMealPlannerSkeleton = computed(
	() => mealPlannerStore.isLoading && mealPlannerStore.orderedDays.length === 0
)

onMounted(() => {
	void mealPlannerStore.fetchMealPlanner()
})
</script>

<template>
	<PageShell>
		<template #header>
			<PageHeader> Weekplanner </PageHeader>
		</template>
		<div v-if="showMealPlannerSkeleton" class="space-y-4">
			<div class="grid gap-3">
				<USkeleton class="h-24 w-full rounded-2xl" />
				<USkeleton class="h-24 w-full rounded-2xl" />
				<USkeleton class="h-24 w-full rounded-2xl" />
				<USkeleton class="h-24 w-full rounded-2xl" />
			</div>
		</div>
		<div v-else class="grid h-[80vh] place-items-center">
			<AppIcon class="w-16" />
		</div>
	</PageShell>
</template>
