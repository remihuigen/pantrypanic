<script lang="ts" setup>
definePageMeta({ layout: 'app' })

const id = useRoute().params.id
</script>

<template>
	<PageShell>
		<PageHeader :badge="1"> Recipe name</PageHeader>
	</PageShell>
</template>
