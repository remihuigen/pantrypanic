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

const { data } = await useAsyncData(route.path, () =>
	queryCollection('blog').path(route.path).first()
)

const page = data.value

if (!page) {
	// Handle page not found
	throw createError({ statusCode: 404, statusMessage: 'Page not found' })
}

const { data: surround } = await useAsyncData(
	`${route.path}-surround`,
	() => {
		return queryCollectionItemSurroundings('blog', route.path, {
			fields: ['shortTitle', 'description']
		}).order('date', 'DESC')
	},
	{
		transform: (data) =>
			data.map((item) =>
				item
					? {
							...item,
							title: item.shortTitle
						}
					: null
			)
	}
)

const items = useBreadcrumbItems({
	overrides: [
		undefined,
		undefined,
		{
			label: page.shortTitle
		}
	]
})

/**
 * Resolves a possibly-relative URL against the current request origin.
 *
 * @param input - Absolute or relative URL.
 * @param origin - Current request origin.
 * @returns An absolute URL string.
 */
function resolveAbsoluteUrl(input: string, origin: string): string {
	return new URL(input, origin).toString()
}

const requestUrl = useRequestURL()

defineArticle({
	'@type': 'BlogPosting',
	headline: page.title,
	description: page.description,
	datePublished: page.date,
	...(page.authors?.length
		? {
				author: page.authors.map((author) => ({
					name: author.name,
					url: author.to,
					image: resolveAbsoluteUrl(author.avatar, requestUrl.origin)
				}))
			}
		: {})
})
</script>

<template>
	<LayoutBlog v-if="page">
		<template #hero>
			<UContainer class="relative py-6 sm:py-16">
				<div
					aria-hidden="true"
					class="border-default absolute inset-0 z-[-1] mx-4 border-x sm:mx-6 lg:mx-8"
				/>
				<div class="mx-auto max-w-2xl space-y-4 px-4 py-8 sm:px-8">
					<UBreadcrumb :items="items" class="mb-8" />

					<div class="text-muted shrink-0 font-mono text-sm">
						{{ formatDate(page.date) }}
					</div>
					<h1 class="text-3xl font-bold sm:text-4xl lg:text-5xl">
						{{ page.title }}
					</h1>
					<p class="text-lg leading-relaxed">{{ page.description }}</p>
					<div v-if="page.authors?.length" class="mt-10 flex items-center gap-6">
						<template v-for="author in page.authors" :key="author.name">
							<ULink
								v-if="author.to"
								:to="author.to"
								target="_blank"
								class="group flex items-center gap-3"
							>
								<UAvatar :src="author.avatar" :alt="author.name" size="lg" />
								<div class="flex flex-col">
									<span class="text-highlighted text-sm font-medium">{{
										author.name
									}}</span>
									<span
										class="text-muted group-hover:text-primary text-xs transition-colors"
										>@{{ author.to.split('/').pop() }}</span
									>
								</div>
							</ULink>
							<div v-else class="flex items-center gap-3">
								<UAvatar :src="author.avatar" :alt="author.name" size="lg" />
								<span class="text-highlighted text-sm font-medium">{{
									author.name
								}}</span>
							</div>
						</template>
					</div>
				</div>
			</UContainer>
		</template>
		<div class="mx-auto max-w-2xl px-4 py-8 sm:px-8 sm:py-12 md:py-16">
			<ContentRenderer :value="page" />
			<USeparator class="my-12 md:my-16" />
			<UContentSurround
				:surround="surround as any"
				:ui="{ linkTitle: 'whitespace-norwrap' }"
			/>
		</div>
	</LayoutBlog>
</template>
