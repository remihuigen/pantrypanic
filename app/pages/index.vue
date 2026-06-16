<script setup lang="ts">
import type { AccordionItem, PricingPlanProps } from '@nuxt/ui'

definePageMeta({
	layout: 'base'
})

const { title, description } = useRuntimeConfig().public.identity
const { getIcon } = useIcon()
const { enableBetaPeriod } = useRuntimeConfig().public

useSeoMeta({
	title,
	ogTitle: title,
	description,
	ogDescription: description
})

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
				label: 'because groceries are not billboards'
			},
			{
				value: '0 trackers',
				label: 'because your fridge is your business'
			},
			{
				value: '0 limits',
				label: 'because households are messy'
			},
			{
				value: 'Self-hostable',
				label: 'because control should notbe optional',
				class: 'text-primary'
			}
		]
	},
	faq: {
		headline: 'Frequently asked questions',
		title: 'Questions before the panic starts?'
	},
	plans: {
		headline: 'Pricing Plans',
		title: 'Choose the plan that fits your family.'
	}
} as const

const faqs: AccordionItem[] = [
	{
		label: 'Why can’t I find Pantry Panic in the App Store or Play Store?',
		content:
			'Pantry Panic is an installable web app, also known as a PWA. That means you use it through your browser, but it can still live on your home screen like a normal app. When your device supports it, Pantry Panic will show an install prompt. If that does not appear, you can usually install it from your browser menu by choosing something like “Add to Home Screen” or “Install app”.'
	},
	{
		label: 'Does Pantry Panic support other languages?',
		content:
			'Not yet. Pantry Panic is currently only available in Dutch. Internationalization is planned for a future update, because grocery chaos is sadly not limited to one country.'
	},
	{
		label: 'How does pricing work for the cloud version?',
		content:
			'Right now, you can buy a lifetime subscription to the Pantry Panic cloud version. One payment, unlimited usage, for as long as Pantry Panic exists. Pricing may change in the future, so if you like lifetime deals, this is probably the good bit.'
	},
	{
		label: 'How does self-hosting work for Pantry Panic?',
		content:
			'Pantry Panic is open source and the code is available on GitHub. The easiest route is deploying it to Cloudflare, without writing a single line of code. Other deployment targets should work too, but Cloudflare is the setup we actively use and test.'
	},
	{
		label: 'Where is my data stored?',
		content:
			'The cloud version of Pantry Panic runs on Cloudflare infrastructure, with data stored in the European Union. Your data is encrypted at rest and in transit, so your grocery lists are treated like private household business — including the suspicious number of snacks.'
	},
	{
		label: 'Who can access my data?',
		content:
			'Your household members can access the lists and data you share with them. Pantry Panic does not sell your data, does not use ads, and does not add trackers to watch your shopping behavior. We keep the business model boring on purpose.'
	}
]

const plans = ref<PricingPlanProps[]>([
	{
		title: 'Single household',
		description: 'Ideal for you if you need to share lists with your direct family.',
		price: '€25',
		features: ['Unlimited members', 'Unlimited lists', 'Lifetime access'],
		button: {
			label: 'Free trial',
			to: '/register?plan=single-household'
		}
	},
	{
		title: 'Multiple households',
		description: 'Ideal for you, your extended family or trips with friends.',
		price: '€39',
		features: [
			'Unlimited members',
			'Unlimited lists',
			'Lifetime access',
			'Multi-household support'
		],
		button: {
			label: 'Free trial',
			to: '/register?plan=multiple-households'
		}
	},
	{
		title: 'Self-Hosted',
		description: 'Install and run Pantry Panic on your own servers.',
		price: '€0',
		features: ['Full control', 'Open source'],
		button: {
			label: 'Explore',
			icon: getIcon('cloud'),
			color: 'neutral'
		}
	}
])

const cta = {
	title: 'Ready for a less chaotic\nshopping list?',
	description: 'Start with Pantry Panic for free and bring some order to the grocery nonsense.'
} as const

const { enterMotion, scrollMotion, staggerMotion } = useMotion()
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
					:label="
						enableBetaPeriod
							? 'Free to use during public beta period'
							: 'Shared groceries without the group-chat noise'
					"
					class="gap-1.5 rounded-full bg-white/5 px-3 py-1.5 backdrop-blur"
				>
					<template #leading>
						<UChip
							inset
							standalone
							:color="enableBetaPeriod ? 'success' : 'primary'"
							:ui="{ base: 'animate-pulse ring-0' }"
						/>
					</template>
				</UBadge>
			</Motion>
			<Motion as="span" v-bind="enterMotion(0.35)" class="inline-block">
				<LandingHeroHeadline />
			</Motion>
		</UContainer>
		<Motion as="div" v-bind="enterMotion(0.3)" class="block">
			<FluidBanner
				color="primary"
				class="mt-60 lg:mt-0"
				container-class="flex flex-col-reverse lg:flex-row lg:gap-20 pt-20"
			>
				<div class="space-y-8 lg:w-1/3 lg:w-[45%]">
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
						<LandingHeroActions />
					</Motion>
				</div>
				<div class="relative -mt-80 grow lg:mt-0">
					<UColorModeImage
						light="/lightmode.png"
						dark="/darkmode.png"
						:width="800"
						:height="800"
						class="mx-auto md:max-w-lg lg:absolute lg:right-0 lg:bottom-0 lg:w-[85%] lg:max-w-2xl"
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
								root: 'text-center h-full py-6',
								wrapper: 'items-center',
								title: [
									'text-2xl font-bold tracking-tight leading-none',
									'class' in metric ? metric.class : ''
								],
								description:
									'font-mono text-xs uppercase tracking-[0.06em] text-dimmed mt-3'
							}"
						/>
					</Motion>
				</div>
			</div>
		</UPageSection>
		<UPageSection
			id="plans"
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
					{{ page.plans.headline }}
				</Motion>
			</template>

			<template #title>
				<Motion as="span" v-bind="scrollMotion(0.1)" class="inline-block">
					{{ page.plans.title }}
				</Motion>
			</template>
			<UPricingPlans>
				<Motion
					v-for="(plan, index) in plans"
					:key="index"
					as="div"
					v-bind="staggerMotion(index)"
					class="grid h-full"
				>
					<UPricingPlan v-bind="plan" />
				</Motion>
			</UPricingPlans>
		</UPageSection>

		<UPageSection
			id="faq"
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
					{{ page.faq.headline }}
				</Motion>
			</template>

			<template #title>
				<Motion as="span" v-bind="scrollMotion(0.1)" class="inline-block">
					{{ page.faq.title }}
				</Motion>
			</template>

			<Motion as="div" v-bind="enterMotion(0.3)" class="mx-auto w-full max-w-xl">
				<UAccordion
					type="multiple"
					:items="faqs"
					:unmount-on-hide="false"
					:ui="{
						trigger: 'text-base py-5',
						body: 'text-base text-muted leading-relaxed'
					}"
				/>
			</Motion>
		</UPageSection>
		<UPageCTA
			variant="naked"
			:ui="{
				root: 'pb-12 sm:pb-16',
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
					class="flex flex-row flex-wrap items-center justify-center gap-3"
					v-bind="scrollMotion(0.2)"
				>
					<LandingBottomCtaLinks />
				</Motion>
			</template>
		</UPageCTA>
	</div>
</template>
