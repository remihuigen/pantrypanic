<script lang="ts" setup>
import type { FormSubmitEvent, RadioGroupItem } from '@nuxt/ui'
import { getIcon } from '#shared/utils/icons'

import { z } from 'zod'

definePageMeta({
	layout: 'base'
})

useSeoMeta({
	title: 'Aan de slag met Pantry Panic',
	ogTitle: 'Aan de slag met Pantry Panic',
	description:
		'Registreer je voor een gratis proefperiode van Pantry Panic en breng rust in je keuken.',
	ogDescription:
		'Registreer je voor een gratis proefperiode van Pantry Panic en breng rust in je keuken.'
})

const { enableBetaPeriod, enablePublicRegistration } = useRuntimeConfig().public

if (!enablePublicRegistration) {
	// Redirect or show a message indicating that public registration is disabled
	throw createError({
		statusCode: 403,
		statusMessage: 'Aanmelden is momenteel uitgeschakeld',
		message: 'Publieke registratie is momenteel uitgeschakeld. Probeer het later opnieuw.',
		fatal: true
	})
}

const schema = z
	.object({
		plan: z.enum(['single-household', 'multiple-households'], {
			error: 'Kies een abonnementstype.'
		}),
		name: z
			.string({ error: 'Naam moet een stringwaarde zijn' })
			.min(1, { error: 'Naam is verplicht.' }),
		initialHouseholdName: z
			.string({ error: 'Naam van het huishouden moet een stringwaarde zijn' })
			.min(1, { error: 'Naam van het huishouden is verplicht.' }),
		email: z.email({ error: 'Ongeldig e-mailadres.' }),
		password: z
			.string({ error: 'Wachtwoord is verplicht.' })
			.min(8, { error: 'Wachtwoord moet minimaal 8 tekens bevatten.' }),
		confirmPassword: z.string({ error: 'Bevestig je wachtwoord.' })
	})
	.refine((data) => data.password === data.confirmPassword, {
		path: ['confirmPassword'],
		error: 'Wachtwoorden komen niet overeen.'
	})

type Schema = z.output<typeof schema>

const route = useRoute()

function initialPlan() {
	if (route.query.plan === 'single-household' || route.query.plan === 'multiple-households') {
		return route.query.plan as 'single-household' | 'multiple-households'
	}
	return 'single-household'
}

const state = reactive<Schema>({
	plan: initialPlan(),
	initialHouseholdName: '',
	name: '',
	email: '',
	password: '',
	confirmPassword: ''
})

const plans = ref<RadioGroupItem[]>([
	{
		label: 'Enkel huishouden',
		value: 'single-household',
		description: 'Levenslange toegang voor een enkel huishouden, voor €25'
	},
	{
		label: 'Meerdere huishoudens',
		value: 'multiple-households',
		description: 'Levenslange toegang voor meerdere huishoudens, voor €39'
	}
])

const loading = ref(false)

// TODO implement turnstile
// - register endpoint from backend should ONLY accept request from this specific page

async function onSubmit(_payload: FormSubmitEvent<Schema>) {
	loading.value = true

	try {
		console.log('Send ', _payload)
	} catch (error) {
		console.error(error)
	} finally {
		loading.value = false
	}
}
</script>

<template>
	<div>
		<UContainer class="relative py-8">
			<div class="mx-auto max-w-2xl space-y-4">
				<UPageCard
					title="Registreer"
					description="Meld je aan voor de gratis proefperiode van Pantry Panic"
					variant="naked"
				/>

				<UPageCard variant="subtle" :ui="{ body: 'space-y-4' }">
					<p v-if="!enableBetaPeriod" class="text-dimmed text-sm">
						Tijdens de proefperiode heb je 30 dagen lang onbeperkt toegang tot Pantry
						Panic. Na afloop van je ervoor kiezen om een
						<i>lifetime subscription</i> aan te schaffen en de app te blijven gebruiken.
					</p>
					<UAlert
						v-else
						:icon="getIcon('badgeCheck')"
						color="success"
						variant="subtle"
						title="Beta periode"
						description="De bètaperiode van Pantry Panic is actief. Tijdens deze periode kun je de app gratis gebruiken. Beschouw het als een hele lange proefperiode!"
					/>
					<UForm
						:state="state"
						:schema="schema"
						class="flex flex-col gap-5"
						@submit="onSubmit"
					>
						<UFormField
							label="Soort abonnement"
							name="plan"
							size="lg"
							:ui="{ label: 'text-base' }"
						>
							<URadioGroup
								v-model="state.plan"
								:items="plans"
								color="primary"
								variant="table"
							/>
						</UFormField>
						<UFormField label="Huishouden" name="initialHouseholdName" size="xl">
							<UInput
								v-model="state.initialHouseholdName"
								:placeholder="`Naam van je ${state.plan === 'multiple-households' ? 'eerste ' : ''} huishouden`"
							/>
						</UFormField>
						<UFormField label="Naam" name="name" size="xl">
							<UInput v-model="state.name" placeholder="Je naam" />
						</UFormField>
						<UFormField label="E-mail" name="email" size="xl">
							<UInput
								v-model="state.email"
								type="email"
								placeholder="Je e-mailadres"
							/>
						</UFormField>
						<FieldRow>
							<UFormField label="Wachtwoord" name="password" size="xl">
								<UInput
									v-model="state.password"
									type="password"
									placeholder="Je wachtwoord"
								/>
							</UFormField>
							<UFormField
								label="Bevestig wachtwoord"
								name="confirmPassword"
								size="xl"
							>
								<UInput
									v-model="state.confirmPassword"
									type="password"
									placeholder="Bevestig je wachtwoord"
								/>
							</UFormField>
						</FieldRow>
						<UButton
							type="submit"
							:loading="loading"
							label="Registreer nu"
							size="xl"
							class="self-start"
							:icon="getIcon('right')"
						/>
					</UForm>
				</UPageCard>
			</div>
		</UContainer>
	</div>
</template>
