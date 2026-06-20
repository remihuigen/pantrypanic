<script setup lang="ts">
import type {
	EditorialPage,
	EditorialSectionKey
} from '../../composables/useEditorialSection'

const props = defineProps<{
	section: EditorialSectionKey
}>()

const sectionConfig = useEditorialSection(props.section)

const { data } = await useAsyncData(`${props.section}-index`, () =>
	queryCollection(sectionConfig.collection).order(sectionConfig.sortField, 'DESC').all()
)

const entries = computed(() => (data.value ?? []) as EditorialPage[])

useSeoMeta({
	title: sectionConfig.pageTitle,
	description: sectionConfig.heroDescription,
	ogTitle: sectionConfig.pageTitle,
	ogDescription: sectionConfig.heroDescription
})

const { enterMotion } = useMotion()
</script>

<template>
	<LayoutEditorialSection>
		<template #hero>
			<UPageHero :ui="{ container: 'relative py-10 sm:py-16 lg:py-24' }">
				<div
					aria-hidden="true"
					class="border-default absolute inset-0 z-[-1] mx-4 border-x sm:mx-6 lg:mx-8"
				/>

				<template #title>
					<Motion as="span" v-bind="enterMotion()" class="inline-block">
						<HeroHeadline class="sm:text-6xl lg:text-7xl">
							{{ sectionConfig.heroTitle }}
						</HeroHeadline>
					</Motion>
				</template>

				<template #description>
					<Motion as="p" v-bind="enterMotion(0.1)" class="inline-block">
						{{ sectionConfig.heroDescription }}
					</Motion>
				</template>
			</UPageHero>
		</template>

		<Motion
			v-for="(entry, index) in entries"
			:key="entry.path"
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
				:to="entry.path"
				class="hover:bg-muted/30 flex flex-col justify-between gap-4 p-4 transition-all duration-200 sm:flex-row sm:items-center sm:gap-6 sm:p-6"
			>
				<div class="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
					<div class="min-w-0 flex-1">
						<div class="text-muted mb-1 shrink-0 font-mono text-xs">
							{{ formatDate(getEditorialDisplayDate(entry, sectionConfig)) }}
						</div>

						<h2
							class="text-highlighted group-hover:text-primary truncate font-medium transition-colors duration-200 sm:text-base"
						>
							{{ entry.title }}
						</h2>
						<p class="text-muted mt-1 line-clamp-2 text-sm sm:line-clamp-1">
							{{ entry.description }}
						</p>
					</div>
				</div>

				<div class="flex shrink-0 items-center justify-between gap-3 sm:justify-end sm:gap-2">
					<UAvatarGroup v-if="entry.authors?.length" size="sm" class="sm:size-sm">
						<UAvatar
							v-for="author in entry.authors.slice(0, 3)"
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
	</LayoutEditorialSection>
</template>
