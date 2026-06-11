<script setup lang="ts">
const settingsStore = useSettingsStore()

const totals = computed(() => settingsStore.stats?.totals)
</script>

<template>
	<UCard>
		<template #header>
			<h2 class="text-base font-semibold">Gebruik</h2>
		</template>

		<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
			<div v-for="entry in [
				['Lijsten', totals?.lists ?? 0],
				['Lijstitems', totals?.listItems ?? 0],
				['Items', totals?.items ?? 0],
				['Recepten', totals?.recipes ?? 0]
			]" :key="entry[0]" class="bg-muted/40 rounded-md p-3">
				<p class="text-muted text-xs">{{ entry[0] }}</p>
				<p class="text-lg font-semibold">{{ entry[1] }}</p>
			</div>
		</div>

		<div class="mt-4 space-y-2">
			<p class="text-sm font-medium">Meest gebruikte items</p>
			<div
				v-for="item in settingsStore.stats?.mostUsedItems ?? []"
				:key="item.itemId"
				class="flex justify-between text-sm"
			>
				<span>{{ item.name }}</span>
				<span class="text-muted">{{ item.count }}</span>
			</div>
		</div>
	</UCard>
</template>
