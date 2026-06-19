<script setup lang="ts">
definePageMeta({
	layout: 'base'
})
const { data: posts } = await useAsyncData('blog', () => queryCollection('blog').all())
</script>

<template>
	<UContainer class="relative grow py-12">
		<h1>Blog</h1>
		<ul>
			<li v-for="post in posts" :key="post.id">
				<NuxtLink :to="post.path">{{ post.title }}</NuxtLink>
			</li>
		</ul>
	</UContainer>
</template>
