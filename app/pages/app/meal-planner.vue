<script lang="ts" setup>
definePageMeta({ layout: 'app' })

const mealPlannerStore = useMealPlannerStore()

onMounted(() => {
	void mealPlannerStore.fetchMealPlanner()
})
</script>

<template>
	<PageShell>
		<template #header>
			<PageHeader> Weekplanner </PageHeader>
		</template>
		<div class="grid h-[80vh] place-items-center">
			<AppIcon class="w-16" />
		</div>
	</PageShell>
</template>
