<script setup lang="ts">
definePageMeta({
	layout: {
		name: 'base',
		props: {
			useShaders: false
		}
	}
})

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
	<UContainer v-if="page" class="relative grow py-12">
		<ContentRenderer :value="page" />
	</UContainer>
</template>
