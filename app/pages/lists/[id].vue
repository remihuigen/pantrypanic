<script lang="ts" setup>
definePageMeta({ layout: 'app' })

const id = useRoute().params.id?.toString() as string

const store = useListsStore()
const list = computed(() => store.listById(id))

if (!list.value) {
	// Handle the case where the list is not found
	throw createError({
		status: 404,
		statusText: 'Lijst niet gevonden',
		fatal: true
	})
}

const items = computed(() => store.listItemsForList(id))
</script>

<template>
	<PageShell>
		<PageHeader :badge="items.length">{{ list?.name }}</PageHeader>
	</PageShell>
</template>
