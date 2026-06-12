<script setup lang="ts">
import type { ButtonProps } from '@nuxt/ui'

definePageMeta({
	// colorMode: 'dark'
})

const { title, description } = useRuntimeConfig().public.identity

useSeoMeta({
	title,
	ogTitle: title,
	description,
	ogDescription: description
})

const heroTitle = computed(() => {
	const [primary = '', ...secondaryParts] = 'Pantry Panic\nFor calm grocery runs'.split('\n')

	return {
		primary,
		secondary: secondaryParts.join(' ').trim()
	}
})

const heroLinks: ButtonProps[] = [
	{
		label: 'Open app',
		to: '/app',
		color: 'primary',
		size: 'xl',
		icon: 'lucide:arrow-right'
	},
	{
		label: 'See features',
		to: '#features',
		color: 'neutral',
		size: 'xl'
	}
]

const page = {
	features: {
		headline: 'Why Pantry Panic',
		title: 'Everything your household needs before anyone reaches the store.',
		description:
			'Keep grocery lists, recipes, pantry staples, and weekly meals in one simple shared app.',
		items: [
			{
				icon: 'i-lucide-list-checks',
				title: 'Shared lists',
				description:
					'Everyone sees the same live grocery list, so last-minute additions stop living in chat.'
			},
			{
				icon: 'i-lucide-refresh-cw',
				title: 'Live updates',
				description:
					'Checked items and new groceries sync quickly across devices while someone is shopping.'
			},
			{
				icon: 'i-lucide-utensils',
				title: 'Recipes to groceries',
				description:
					'Save recurring meals and copy ingredients straight to the right shopping list.'
			},
			{
				icon: 'i-lucide-calendar-days',
				title: 'Meal planning',
				description:
					'Plan the week, park leftovers, and turn dinner ideas into groceries before the fridge is empty.'
			},
			{
				icon: 'i-lucide-archive',
				title: 'Item memory',
				description:
					'Pantry Panic remembers common items, units, and previous names to keep entry fast.'
			},
			{
				icon: 'i-lucide-home',
				title: 'Household control',
				description:
					'Invite members, manage owners, and keep each household scoped to the people who belong there.'
			}
		]
	},
	metrics: {
		headline: 'Built for real homes',
		title: 'Small enough for your family, solid enough to self-host.',
		description:
			'Pantry Panic keeps the daily workflow fast while preserving clear household boundaries and data ownership.',
		items: [
			{
				value: '7 days',
				label: 'Meal planner',
				class: 'text-success'
			},
			{
				value: '1 tap',
				label: 'Check off items',
				class: 'text-primary'
			},
			{
				value: '0 ads',
				label: 'Self-hosted focus',
				class: 'text-info'
			},
			{
				value: 'Multi',
				label: 'Household ready',
				class: 'text-warning'
			}
		]
	},
	cta: {
		title: 'Ready for a less chaotic\nshopping list?',
		description:
			'Open the app if you already have access, or self-host Pantry Panic for your own household.',
		command: 'pnpm dev',
		links: [
			{
				label: 'Open app',
				color: 'primary',
				to: '/app'
			},
			{
				label: 'Review setup',
				color: 'neutral',
				variant: 'subtle',
				to: 'https://github.com/remihuigen/pantrypanic'
			}
		]
	}
} as const

function enterMotion(delay: number = 0) {
	return {
		initial: { opacity: 0, y: 16 },
		animate: { opacity: 1, y: 0 },
		transition: { duration: 0.6, delay }
	}
}

function scrollMotion(delay: number = 0) {
	return {
		initial: { opacity: 0, y: 16 },
		whileInView: { opacity: 1, y: 0 },
		inViewOptions: { once: true, amount: 1 },
		transition: { duration: 0.6, delay }
	}
}

function staggerMotion(index: number = 0) {
	return {
		initial: { opacity: 0 },
		whileInView: { opacity: 1 },
		inViewOptions: { once: true, amount: 1 },
		transition: { duration: 0.6, delay: index * 0.08 }
	}
}

const { copy, copied } = useClipboard()
</script>

<template>
	<div>
		<Motion v-bind="staggerMotion(0)">
			<HeroShaders class="absolute inset-x-0 top-0 h-[130vh] opacity-30 dark:opacity-25" />
		</Motion>
		<UPageHero
			:ui="{
				root: 'pb-24 sm:pb-32',
				container: 'relative z-10 lg:py-32',
				wrapper: 'flex flex-col items-center',
				title: 'sm:text-6xl lg:text-7xl xl:text-[80px] tracking-tighter leading-[1.05]',
				description:
					'mt-5 max-w-xl mx-auto text-base sm:text-lg leading-relaxed text-default',
				links: 'gap-3'
			}"
		>
			<template #top>
				<GradientGlow class="top-0 h-1/2 w-2/3" />
			</template>

			<template #headline>
				<Motion v-bind="enterMotion(0.2)">
					<UBadge
						color="neutral"
						variant="soft"
						label="Shared groceries without the group-chat noise"
						class="gap-1.5 rounded-full bg-white/5 px-3 py-1.5 backdrop-blur"
					>
						<template #leading>
							<UChip inset standalone :ui="{ base: 'animate-pulse ring-0' }" />
						</template>
					</UBadge>
				</Motion>
			</template>

			<template #title>
				<Motion as="span" v-bind="enterMotion(0.35)" class="inline-block">
					{{ heroTitle.primary }}
					<br v-if="heroTitle.secondary" />
					<span
						v-if="heroTitle.secondary"
						class="animate-shimmer bg-size-[200%_auto] bg-clip-text text-transparent"
						:style="{
							backgroundImage:
								'linear-gradient(135deg, var(--color-primary-400), var(--color-primary-300), var(--color-primary-200), var(--color-primary-100), var(--color-primary-200), var(--color-primary-300), var(--color-primary-400))',
							animationDuration: '10s'
						}"
					>
						{{ heroTitle.secondary }}
					</span>
				</Motion>
			</template>

			<template #description>
				<Motion as="span" v-bind="enterMotion(0.5)" class="inline-block">
					A fast, self-hostable grocery app for households that want shared lists,
					recipe-powered shopping, and a weekly plan without turning dinner into project
					management.
				</Motion>
			</template>

			<template #links>
				<Motion class="flex flex-wrap justify-center gap-6" v-bind="enterMotion(0.65)">
					<UButton v-for="link in heroLinks" :key="link.label" v-bind="link" />
				</Motion>
			</template>
		</UPageHero>

		<UPageSection
			id="features"
			:ui="{
				root: 'py-24 sm:py-32 scroll-mt-(--ui-header-height)',
				container: 'max-w-5xl',
				headline:
					'font-mono font-medium text-xs text-primary uppercase tracking-[0.12em] text-center',
				title: 'max-w-lg mx-auto',
				description: 'max-w-md mx-auto text-dimmed'
			}"
		>
			<template #headline>
				<Motion as="span" v-bind="scrollMotion()" class="inline-block">
					{{ page.features.headline }}
				</Motion>
			</template>

			<template #title>
				<Motion as="span" v-bind="scrollMotion(0.1)" class="inline-block">
					{{ page.features.title }}
				</Motion>
			</template>

			<template #description>
				<Motion as="span" v-bind="scrollMotion(0.2)" class="inline-block">
					{{ page.features.description }}
				</Motion>
			</template>

			<div class="border-default bg-default overflow-hidden rounded-2xl border">
				<div class="grid grid-cols-1 gap-px sm:grid-cols-2 lg:grid-cols-3">
					<Motion
						v-for="(feature, index) in page.features.items"
						:key="feature.title"
						v-bind="staggerMotion(index)"
					>
						<UPageCard
							:icon="feature.icon"
							:title="feature.title"
							:description="feature.description"
							class="rounded-none duration-300"
							:ui="{
								leading: 'mb-5 flex size-9 justify-center rounded-lg bg-primary/10',
								title: 'text-sm tracking-tight',
								description:
									'text-sm leading-relaxed sm:line-clamp-2 lg:line-clamp-3 text-dimmed'
							}"
						/>
					</Motion>
				</div>
			</div>
		</UPageSection>

		<UPageSection
			id="metrics"
			:ui="{
				root: 'py-24 sm:py-32 scroll-mt-(--ui-header-height)',
				container: 'max-w-5xl',
				headline:
					'font-mono font-medium text-xs text-primary uppercase tracking-[0.12em] text-center',
				title: 'max-w-lg mx-auto',
				description: 'max-w-md mx-auto text-dimmed'
			}"
		>
			<template #headline>
				<Motion as="span" v-bind="scrollMotion()" class="inline-block">
					{{ page.metrics.headline }}
				</Motion>
			</template>

			<template #title>
				<Motion as="span" v-bind="scrollMotion(0.1)" class="inline-block">
					{{ page.metrics.title }}
				</Motion>
			</template>

			<template #description>
				<Motion as="span" v-bind="scrollMotion(0.2)" class="inline-block">
					{{ page.metrics.description }}
				</Motion>
			</template>

			<div class="border-default bg-default overflow-hidden rounded-2xl border">
				<div class="grid gap-px sm:grid-cols-2 lg:grid-cols-4">
					<Motion
						v-for="(metric, index) in page.metrics.items"
						:key="metric.label"
						v-bind="staggerMotion(index)"
					>
						<UPageCard
							:title="metric.value"
							:description="metric.label"
							class="rounded-none duration-300"
							:ui="{
								root: 'text-center',
								wrapper: 'items-center',
								title: [
									'text-4xl font-bold tracking-tight leading-none',
									metric.class
								],
								description:
									'font-mono text-xs uppercase tracking-[0.06em] text-dimmed mt-3'
							}"
						/>
					</Motion>
				</div>
			</div>
		</UPageSection>

		<UPageCTA
			variant="naked"
			:ui="{
				root: 'py-24 sm:py-32',
				container: 'max-w-3xl text-center',
				title: 'lg:text-5xl tracking-tighter whitespace-pre-line',
				description: 'mx-auto max-w-sm leading-relaxed text-dimmed'
			}"
		>
			<template #top>
				<GradientGlow class="bottom-0 h-1/2 w-2/3" />
			</template>

			<template #title>
				<Motion as="span" v-bind="scrollMotion()" class="inline-block">
					{{ page.cta.title }}
				</Motion>
			</template>

			<template #description>
				<Motion as="span" v-bind="scrollMotion(0.1)" class="inline-block">
					{{ page.cta.description }}
				</Motion>
			</template>

			<template #links>
				<Motion
					class="flex flex-col items-center justify-center gap-6"
					v-bind="scrollMotion(0.2)"
				>
					<UButton
						v-for="link in page.cta.links"
						:key="link.label"
						v-bind="link"
						size="xl"
					/>

					<UButton
						:label="page.cta.command"
						:trailing-icon="copied ? 'i-lucide-copy-check' : 'i-lucide-copy'"
						color="neutral"
						variant="subtle"
						class="text-toned gap-4 font-mono font-light"
						size="xl"
						:ui="{ trailingIcon: 'size-5' }"
						@click="copy(page.cta.command)"
					/>
				</Motion>
			</template>
		</UPageCTA>
	</div>
</template>
