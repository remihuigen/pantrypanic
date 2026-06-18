<script setup lang="ts">
const route = useRoute()

const { data: page } = await useAsyncData(route.path, () =>
	queryCollection('blog').path(route.path).first()
)

if (!page.value) {
	// Handle page not found
	throw createError({ statusCode: 404, statusMessage: 'Page not found' })
}
</script>

<template>
	<div v-if="page">
		<ContentRenderer :value="page" />
	</div>
</template>
