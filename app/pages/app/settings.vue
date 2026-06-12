<script setup lang="ts">
definePageMeta({ layout: 'app' })
</script>

<template>
	<PageShell>
		<template #header>
			<PageHeader>Instellingen</PageHeader>
		</template>

		<SettingsNavigation />

		<div class="mx-auto grid max-w-2xl gap-4 pt-4">
			<NuxtPage />
		</div>
	</PageShell>
</template>
