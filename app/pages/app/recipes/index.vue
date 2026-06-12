<script lang="ts" setup>
definePageMeta({ layout: 'app' })

const recipesStore = useRecipesStore()

onMounted(() => {
	void recipesStore.fetchRecipes({ status: 'active' })
})
</script>

<template>
	<PageShell>
		<template #header>
			<PageHeader> Recepten </PageHeader>
		</template>
		<div class="grid h-[80vh] place-items-center">
			<AppIcon class="w-16" />
		</div>
	</PageShell>
</template>
