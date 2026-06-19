<script setup lang="ts">
definePageMeta({
	layout: 'base',
	breadcrumb: {
		icon: getIcon('blog')
	}
})

const { data: posts } = await useAsyncData('posts', () =>
	queryCollection('blog').order('date', 'DESC').all()
)

useSeoMeta({
	title: 'Blog',
	description:
		'Where we share thoughts, observations and occasional rants about human behavior, technology, and everything in between.',
	ogTitle: 'Blog',
	ogDescription:
		'Where we share thoughts, observations and occasional rants about human behavior, technology, and everything in between.'
})

const { enterMotion } = useMotion()
</script>

<template>
	<LayoutBlog>
		<template #hero>
			<UPageHero :ui="{ container: 'relative py-10 sm:py-16 lg:py-24' }">
				<div
					aria-hidden="true"
					class="border-default absolute inset-0 z-[-1] mx-4 border-x sm:mx-6 lg:mx-8"
				/>

				<template #title>
					<Motion as="span" v-bind="enterMotion()" class="inline-block">
						<HeroHeadline class="sm:text-6xl lg:text-7xl">
							Notes from Aisle 7
						</HeroHeadline>
					</Motion>
				</template>

				<template #description>
					<Motion as="p" v-bind="enterMotion(0.1)" class="inline-block">
						Welcome to the Pantry Panic Blog, where we share thoughts, observations and
						occasional rants about human behavior, technology, and everything in
						between.
					</Motion>
				</template>
			</UPageHero>
		</template>

		<Motion
			v-for="(post, index) in posts"
			:key="post.path"
			:initial="{ opacity: 0, x: -20 }"
			:animate="{ opacity: 1, x: 0 }"
			:transition="{
				delay: index * 0.05,
				type: 'spring',
				stiffness: 300,
				damping: 30
			}"
			class="group border-default border-b last:border-b-0"
		>
			<ULink
				:to="post.path"
				class="hover:bg-muted/30 flex flex-col justify-between gap-4 p-4 transition-all duration-200 sm:flex-row sm:items-center sm:gap-6 sm:p-6"
			>
				<div
					class="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:gap-6"
				>
					<div class="min-w-0 flex-1">
						<div class="text-muted mb-1 shrink-0 font-mono text-xs">
							{{ formatDate(post.date) }}
						</div>

						<h2
							class="text-highlighted group-hover:text-primary truncate font-medium transition-colors duration-200 sm:text-base"
						>
							{{ post.title }}
						</h2>
						<p class="text-muted mt-1 line-clamp-2 text-sm sm:line-clamp-1">
							{{ post.description }}
						</p>
					</div>
				</div>

				<div
					class="flex shrink-0 items-center justify-between gap-3 sm:justify-end sm:gap-2"
				>
					<UAvatarGroup v-if="post.authors?.length" size="sm" class="sm:size-sm">
						<UAvatar
							v-for="author in post.authors.slice(0, 3)"
							:key="author.name"
							:src="author.avatar"
							:alt="author.name"
							size="sm"
						/>
					</UAvatarGroup>

					<UIcon
						name="i-lucide-chevron-right"
						class="text-muted group-hover:text-highlighted size-4 shrink-0 transition-colors duration-200"
					/>
				</div>
			</ULink>
		</Motion>
	</LayoutBlog>
</template>
