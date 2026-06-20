<script setup lang="ts">
definePageMeta({
	layout: {
		name: 'base',
		props: {
			useShaders: false
		}
	},
	breadcrumb: {
		icon: getIcon('legal')
	}
})
</script>

<template>
	<EditorialCollectionPage section="legal" />
</template>
