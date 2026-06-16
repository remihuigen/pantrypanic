<script setup lang="ts">
import type { ButtonProps } from '@nuxt/ui'

definePageMeta({
	layout: 'base'
})

const { title, description } = useRuntimeConfig().public.identity
const { getIcon } = useIcon()

useSeoMeta({
	title,
	ogTitle: title,
	description,
	ogDescription: description
})

const colorMode = useColorMode()
const { loggedIn } = useUserSession()

const page = {
	features: {
		headline: 'Why Pantry Panic',
		title: 'Everything you need before anyone reaches the store.',
		description:
			'Another grocery app? Technically, yes. Except this one actually understands what needs to happen before anyone is already standing in aisle seven.',
		items: [
			{
				icon: 'i-lucide-list-checks',
				title: 'Shared lists',
				description:
					'One list for everyone. Add, edit, and check off groceries without creating three versions of the same shopping chaos.'
			},
			{
				icon: 'i-lucide-refresh-cw',
				title: 'Live updates',
				description:
					'Checked items and new groceries sync quickly across devices, so last-minute additions stop living in chat.'
			},
			{
				icon: 'i-lucide-utensils',
				title: 'Recipe-based shopping',
				description:
					'Save the meals you actually cook and send their ingredients straight to the right shopping list.'
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
					'Pantry Panic remembers common items, units, and categories, so building your list gets faster every time.'
			},
			{
				icon: 'lucide:home',
				title: 'For the whole household',
				description:
					'Invite everyone who shops, cooks, forgets things, or mysteriously finishes the good snacks.'
			}
		]
	},
	metrics: {
		headline: 'Built for private people',
		title: 'No ads, no tracking, no guardrails.',
		description:
			'Pantry Panic gives you a calm grocery app without creepy data games, usage limits, surprise monetization or unwanted third party involvement.',
		items: [
			{
				value: '0 ads',
				label: 'because groceries are not billboards',
				class: 'text-secondary'
			},
			{
				value: '0 trackers',
				label: 'because your fridge is your business',
				class: 'text-secondary'
			},
			{
				value: '0 limits',
				label: 'because households are messy',
				class: 'text-secondary'
			},
			{
				value: 'Self-hostable',
				label: 'because control should notbe optional',
				class: 'text-primary'
			}
		]
	}
} as const

const cta = computed<{
	title: string
	description: string
	links: Array<ButtonProps>
}>(() => ({
	title: 'Ready for a less chaotic\nshopping list?',
	description: 'Start with Pantry Panic for free and bring some order to the grocery nonsense.',
	links: [
		{
			label: loggedIn.value ? 'Open app' : 'Start free trial',
			color: 'primary',
			to: loggedIn.value ? '/app' : undefined,
			trailingIcon: getIcon('right')
		},
		{
			label: 'Explore self-hosting',
			color: 'neutral',
			variant: 'subtle',
			trailingIcon: getIcon('cloud'),
			to: 'https://github.com/remihuigen/pantrypanic'
		}
	]
}))

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
</script>

<template>
	<div class="overflow-x-hidden">
		<Motion v-bind="staggerMotion(0)">
			<HeroShaders class="absolute inset-x-0 top-0 h-[130vh] opacity-30 dark:opacity-25" />
		</Motion>

		<UContainer class="relative space-y-8 pt-16 pb-16 md:pt-28">
			<GradientGlow
				class="top-0 left-0 h-full w-1/2 animate-pulse opacity-100 [animation-duration:5s]"
			/>
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
			<Motion as="span" v-bind="enterMotion(0.35)" class="inline-block">
				<h1 class="text-5xl font-bold md:text-7xl lg:text-8xl">
					<span
						class="animate-shimmer bg-size-[200%_auto] bg-clip-text text-transparent"
						:style="{
							backgroundImage:
								colorMode.value === 'dark'
									? 'linear-gradient(135deg, var(--color-primary-300), var(--color-primary-200), var(--color-primary-100), var(--color-primary-50), var(--color-primary-100), var(--color-primary-200), var(--color-primary-300))'
									: 'linear-gradient(135deg, var(--ui-text-highlighted), var(--ui-text), var(--color-primary-500), var(--ui-text), var(--ui-text-highlighted))',
							animationDuration: '10s'
						}"
					>
						For <strong class="font-black">calm</strong>
						<br />
						grocery runs
					</span>
				</h1>
			</Motion>
		</UContainer>
		<Motion as="div" v-bind="enterMotion(0.3)" class="block">
			<FluidBanner
				color="primary"
				class="mt-80 lg:mt-0"
				container-class="flex flex-col-reverse md:flex-row gap-8 lg:gap-20"
			>
				<div class="space-y-8 md:w-[45%] lg:w-1/3">
					<Motion
						as="p"
						v-bind="enterMotion(0.5)"
						class="inline-block leading-loose font-medium"
					>
						A fast, modern and minimalistic grocery app for households that want shared
						lists, recipe-powered shopping, and a weekly plan without turning dinner
						into project management.
					</Motion>
					<Motion as="div" v-bind="enterMotion(0.6)" class="inline-block">
						<div clas="flex gap-3 items-center flex-wrap">
							<UButton
								size="xl"
								color="primary"
								:label="!!loggedIn ? 'Open app' : 'Start free trial'"
								:to="!!loggedIn ? '/app/lists' : undefined"
								:trailing-icon="getIcon('right')"
								:ui="{ trailingIcon: 'size-4' }"
							/>
							<UButton
								v-if="!loggedIn"
								size="xl"
								color="neutral"
								variant="link"
								label="login with account"
								to="/login"
							/>
						</div>
					</Motion>
				</div>
				<div class="relative -mt-80 grow lg:mt-0">
					<UColorModeImage
						light="/lightmode.png"
						dark="/darkmode.png"
						:width="600"
						:height="800"
						class="mx-auto max-w-[420px] lg:absolute lg:-right-1/6 lg:bottom-0"
					/>
				</div>
			</FluidBanner>
		</Motion>

		<UPageSection
			id="features"
			:ui="{
				root: 'py-12 scroll-mt-(--ui-header-height)',
				container: 'max-w-5xl',
				headline:
					'font-mono font-black text-xs text-primary uppercase tracking-[0.12em] text-center',
				title: 'max-w-lg mx-auto',
				description: 'max-w-2xl mx-auto text-dimmed'
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
				<Motion as="p" v-bind="scrollMotion(0.2)" class="block">
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
								root: 'h-full!',
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
				root: 'scroll-mt-(--ui-header-height)',
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
								root: 'text-center h-full',
								wrapper: 'items-center',
								title: [
									'text-2xl font-bold tracking-tight leading-none',
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
				root: 'py-12 sm:py-16',
				container: 'max-w-3xl text-center',
				title: 'lg:text-5xl tracking-tighter whitespace-pre-line',
				description: 'mx-auto max-w-sm leading-relaxed text-dimmed'
			}"
		>
			<template #top>
				<GradientGlow class="bottom-0 h-3/4 w-full" />
			</template>

			<template #title>
				<Motion as="span" v-bind="scrollMotion()" class="inline-block">
					{{ cta.title }}
				</Motion>
			</template>

			<template #description>
				<Motion as="span" v-bind="scrollMotion(0.1)" class="inline-block">
					{{ cta.description }}
				</Motion>
			</template>

			<template #links>
				<Motion
					class="flex flex-row items-center justify-center gap-3"
					v-bind="scrollMotion(0.2)"
				>
					<UButton v-for="link in cta.links" :key="link.label" v-bind="link" size="xl" />
				</Motion>
			</template>
		</UPageCTA>
	</div>
</template>
