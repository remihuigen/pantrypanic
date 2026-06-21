<script setup lang="ts">
const settingsStore = useSettingsStore()

const totals = computed(() => settingsStore.stats?.totals)
</script>

<template>
	<div class="space-y-4">
		<UPageCard
			title="Gebruik"
			description="Statistieken van je lijstjes"
			variant="naked"
			orientation="horizontal"
		/>
		<UPageCard variant="subtle" :ui="{ body: 'space-y-4' }">
			<div class="grid grid-cols-2 gap-3 sm:grid-cols-5">
				<div
					v-for="entry in [
						['Lijsten', totals?.lists ?? 0],
						['Lijstitems', totals?.listItems ?? 0],
						['Items', totals?.items ?? 0],
						['Categorieën', totals?.categories ?? 0],
						['Recepten', totals?.recipes ?? 0]
					]"
					:key="entry[0]"
					class="rounded-md bg-white p-3 dark:bg-neutral-800"
				>
					<p class="text-muted text-xs">{{ entry[0] }}</p>
					<p class="text-lg font-semibold">{{ entry[1] }}</p>
				</div>
			</div>
			<div v-if="settingsStore.stats?.mostUsedItems?.length" class="mt-4 space-y-2">
				<h3 class="text-sm font-bold">Meest gebruikte items</h3>
				<div
					v-for="item in settingsStore.stats?.mostUsedItems ?? []"
					:key="item.itemId"
					class="flex justify-between text-sm"
				>
					<span>{{ item.name }}</span>
					<span class="text-muted">{{ item.count }}</span>
				</div>
			</div>
		</UPageCard>
	</div>
</template>
