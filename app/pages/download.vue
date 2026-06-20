<script setup lang="ts">
import type { ButtonProps } from '@nuxt/ui'

import { getIcon } from '#shared/utils/icons'

definePageMeta({
	layout: 'base'
})

useSeoMeta({
	title: 'Download Pantry Panic',
	ogTitle: 'Download Pantry Panic',
	description:
		'Installeer Pantry Panic als app op je telefoon, tablet of computer via de browserprompt of handmatige browserstappen.',
	ogDescription:
		'Installeer Pantry Panic als app op je telefoon, tablet of computer via de browserprompt of handmatige browserstappen.'
})

type InstallStep = {
	value: number
	title: string
	description: string
	content: string
	icon: string
}

const { canShowInstallPrompt, installApp, isStandaloneContext } = usePwaInstallPrompt()
const isInstalling = shallowRef(false)

const installLinks = computed<ButtonProps[]>(() => {
	if (isStandaloneContext.value) {
		return [
			{
				label: 'Open de app',
				to: '/app',
				icon: getIcon('arrowLeft'),
				color: 'primary' as const
			}
		]
	}

	return [
		{
			label: 'Download Pantry Panic',
			icon: getIcon('download'),
			color: 'primary' as const,
			loading: canShowInstallPrompt.value ? isInstalling.value : false,
			disabled: canShowInstallPrompt.value ? isInstalling.value : false,
			onClick: canShowInstallPrompt.value
				? async () => {
						isInstalling.value = true

						try {
							await installApp()
						} finally {
							isInstalling.value = false
						}
					}
				: undefined,
			to: canShowInstallPrompt.value ? undefined : '#installatie-stappen'
		}
	]
})

const steps = computed<InstallStep[]>(() => {
	if (isStandaloneContext.value) {
		return [
			{
				value: 1,
				title: 'Pantry Panic staat al op dit apparaat',
				description: 'Je hoeft niets meer te installeren.',
				icon: getIcon('badgeCheck')
			},
			{
				value: 2,
				title: 'Gebruik dezelfde lijsten en recepten',
				description: 'Je account en gegevens blijven hetzelfde.',
				icon: getIcon('listChecks')
			}
		]
	}

	return [
		{
			value: 1,
			title: 'Open deze pagina op het juiste apparaat',
			description:
				'Gebruik de telefoon, tablet of computer waarop je Pantry Panic wilt installeren.',
			icon: getIcon('download')
		},
		{
			value: 2,
			title: canShowInstallPrompt.value
				? 'Bevestig de browserprompt'
				: 'Gebruik het browsermenu als fallback',
			description: canShowInstallPrompt.value
				? 'Accepteer de installatie wanneer de browser daarom vraagt.'
				: 'Niet elke browser toont direct een native installatieprompt.',
			icon: canShowInstallPrompt.value ? getIcon('check') : getIcon('externalLink')
		},
		{
			value: 3,
			title: 'Open Pantry Panic als losse app',
			description:
				'Start daarna Pantry Panic vanaf je apparaat in plaats van vanuit een tabblad.',
			icon: getIcon('home')
		}
	]
})
</script>

<template>
	<UContainer class="pb-12 sm:pb-16 lg:pb-24">
		<div class="mx-auto flex w-full max-w-4xl flex-col gap-10">
			<UPageHero
				:description="`Install Pantry Panic on your phone, tablet, desktop or airplane board computer.${isStandaloneContext ? ' Though it seems like you already did.' : ''}`"
				:links="installLinks"
				:ui="{ container: 'py-20 sm:py-24 lg:py-28' }"
			>
				<template #headline>
					<UBadge
						color="neutral"
						variant="soft"
						label="Compatible with any device"
						class="gap-1.5 rounded-full bg-white/5 px-3 py-1.5 backdrop-blur"
					>
						<template #leading>
							<UChip
								inset
								standalone
								color="primary"
								:ui="{ base: 'animate-pulse ring-0' }"
							/>
						</template>
					</UBadge>
				</template>
				<template #title>
					<HeroHeadline> Download Pantry Panic App </HeroHeadline>
				</template>
			</UPageHero>
		</div>
		<UStepper
			:items="steps"
			orientation="horizontal"
			disabled
			:default-value="steps[steps.length - 1]?.value"
			:ui="{
				item: 'max-w-xs',
				header: 'justify-between',
				separator: 'end-[calc(-100%+28px)]',
				title: 'mb-2 text-md font-bold'
			}"
		>
		</UStepper>
	</UContainer>
</template>
