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
		},
		{
			label: 'Open de app',
			to: '/app',
			icon: getIcon('arrowLeft'),
			color: 'neutral' as const,
			variant: 'subtle' as const
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
				content:
					'Open Pantry Panic vanaf je beginscherm, dock of appstarter. Je gebruikt al een standalone app-context.',
				icon: getIcon('badgeCheck')
			},
			{
				value: 2,
				title: 'Gebruik dezelfde lijsten en recepten',
				description: 'Je account en gegevens blijven hetzelfde.',
				content:
					'De geinstalleerde app opent direct in de app-shell zonder browserbalken, met dezelfde lijsten, recepten en weekplanner.',
				icon: getIcon('listChecks')
			}
		]
	}

	return [
		{
			value: 1,
			title: 'Open deze pagina op het juiste apparaat',
			description: 'Gebruik de telefoon, tablet of computer waarop je Pantry Panic wilt installeren.',
			content:
				'De downloadknop hierboven probeert de native browserprompt te openen zodra de browser die ondersteunt voor deze sessie.',
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
			content: canShowInstallPrompt.value
				? 'Na bevestiging voegt je browser Pantry Panic toe aan je beginscherm, dock of apps-overzicht.'
				: 'Zoek in het browsermenu naar een optie zoals "Install app", "Add to Home Screen" of "Toevoegen aan beginscherm" en rond daar de installatie af.',
			icon: canShowInstallPrompt.value ? getIcon('check') : getIcon('externalLink')
		},
		{
			value: 3,
			title: 'Open Pantry Panic als losse app',
			description: 'Start daarna Pantry Panic vanaf je apparaat in plaats van vanuit een tabblad.',
			content:
				'Je krijgt dan de app-ervaring zonder normale browserbalken, terwijl je gewoon dezelfde accountgegevens en inhoud blijft gebruiken.',
			icon: getIcon('home')
		}
	]
})
</script>

<template>
	<UContainer class="py-10 sm:py-14 lg:py-20">
		<div class="mx-auto flex w-full max-w-4xl flex-col gap-10">
			<UPageHero
				:title="
					isStandaloneContext
						? 'Pantry Panic staat al op dit apparaat.'
						: 'Download Pantry Panic als app.'
				"
				:description="
					isStandaloneContext
						? 'Je gebruikt al een geinstalleerde of standalone versie van Pantry Panic. Open de app direct vanaf je apparaat wanneer je boodschappen wilt beheren.'
						: 'Installeer Pantry Panic op je telefoon, tablet of computer zodat je sneller bij je lijsten, recepten en weekplanner zit.'
				"
				:links="installLinks"
				:ui="{ container: 'relative overflow-hidden rounded-3xl border border-default px-6 py-10 sm:px-8 lg:px-10' }"
			>
				<template #headline>
					<UBadge color="neutral" variant="soft" class="rounded-full px-3 py-1">
						PWA download
					</UBadge>
				</template>
			</UPageHero>

			<UCard id="installatie-stappen" :ui="{ body: 'space-y-6 p-6 sm:p-8' }">
				<div class="space-y-2">
					<h2 class="text-highlighted text-lg font-semibold">Installatie in stappen</h2>
					<p class="text-muted text-sm leading-6 sm:text-base">
						De knop hierboven opent de native prompt wanneer je browser die beschikbaar
						maakt. Als dat niet gebeurt, volg je dezelfde installatie hieronder handmatig.
					</p>
				</div>

				<UStepper
					:items="steps"
					orientation="vertical"
					:default-value="steps[0]?.value"
					disabled
					class="w-full"
				>
					<template #content="{ item }">
						<p class="text-muted text-sm leading-6 sm:text-base">
							{{ item.content }}
						</p>
					</template>
				</UStepper>
			</UCard>
		</div>
	</UContainer>
</template>
