<script setup lang="ts">
import type {
	EditorialAuthor,
	EditorialPage,
	EditorialSectionKey
} from '../../composables/useEditorialSection'

const props = defineProps<{
	section: EditorialSectionKey
}>()

const route = useRoute()
const requestUrl = useRequestURL()
const sectionConfig = useEditorialSection(props.section)

const { data } = await useAsyncData(route.path, () =>
	queryCollection(sectionConfig.collection).path(route.path).first()
)

const page = data.value as EditorialPage | null

if (!page) {
	throw createError({ statusCode: 404, statusMessage: 'Page not found' })
}

const { data: surround } = await useAsyncData(
	`${route.path}-surround`,
	async () => {
		if (sectionConfig.sortField) {
			return await queryCollectionItemSurroundings(sectionConfig.collection, route.path, {
				fields: ['title', 'shortTitle', 'description']
			}).order(sectionConfig.sortField, 'DESC')
		}

		return await queryCollectionItemSurroundings(sectionConfig.collection, route.path, {
			fields: ['title', 'shortTitle', 'description']
		})
	},
	{
		transform: (items) =>
			items.map((item) =>
				item
					? {
							...item,
							title: item.shortTitle || item.title
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
			label: getEditorialLabel(page)
		}
	]
})

useSeoMeta({
	title: page.title,
	description: page.description,
	ogTitle: page.title,
	ogDescription: page.description
})

if (sectionConfig.structuredDataType === 'blog') {
	defineArticle({
		'@type': 'BlogPosting',
		headline: page.title,
		description: page.description,
		datePublished: page.dateCreated,
		dateModified: page.dateUpdated,
		...(page.authors?.length
			? {
					author: page.authors.map((author: EditorialAuthor) => ({
						name: author.name,
						url: author.to,
						image: new URL(author.avatar, requestUrl.origin).toString()
					}))
				}
			: {})
	})
}
</script>

<template>
	<LayoutEditorialSection>
		<template #hero>
			<UContainer class="relative py-6 sm:py-16">
				<div
					aria-hidden="true"
					class="border-default absolute inset-0 z-[-1] mx-4 border-x sm:mx-6 lg:mx-8"
				/>
				<div class="mx-auto max-w-2xl space-y-4 px-4 py-8 sm:px-8">
					<UBreadcrumb :items="items" class="mb-8" />

					<div class="text-muted shrink-0 font-mono text-sm">
						{{ formatDate(getEditorialDisplayDate(page, sectionConfig)) }}
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
	</LayoutEditorialSection>
</template>
