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
	<LayoutBlog v-if="page">
		<template #hero>
			<UContainer class="relative py-10 sm:py-16 lg:py-24">
				<div
					aria-hidden="true"
					class="border-default absolute inset-0 z-[-1] mx-4 border-x sm:mx-6 lg:mx-8"
				/>
			</UContainer>
		</template>
		<div class="mx-auto max-w-2xl px-4 py-8 sm:px-8 sm:py-12 md:py-16 lg:py-20">
			<ContentRenderer :value="page" />
		</div>
	</LayoutBlog>
</template>
