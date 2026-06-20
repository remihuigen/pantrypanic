<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'

import { getIcon } from '#shared/utils/icons'
import { z } from 'zod'

definePageMeta({ layout: 'base' })

useSeoMeta({
	title: 'Neem deel aan mijn huishouden op Pantry Panic',
	ogTitle: 'Neem deel aan mijn huishouden op Pantry Panic',
	description:
		'Sluit je aan bij mijn huishouden op Pantry Panic en deel boodschappenlijsten, recepten en meer.',
	ogDescription:
		'Sluit je aan bij mijn huishouden op Pantry Panic en deel boodschappenlijsten, recepten en meer.'
})

const schema = z.strictObject({
	name: z.string().min(1, 'Naam is verplicht.'),
	email: z.email('Ongeldig e-mailadres.'),
	password: z.string().min(8, 'Wachtwoord moet minimaal 8 tekens bevatten.')
})

const turnstileRef = useTemplateRef('turnstile')
const route = useRoute()
const toast = useToast()
const { fetch } = useUserSession()
const loading = ref(false)
const state = reactive<Schema>({
	name: '',
	email: '',
	password: ''
})

type Schema = z.output<typeof schema>

const {
	token: turnstileToken,
	isEnabled: isTurnstileEnabled,
	getTokenWithRetry,
	isReady,
	reset: resetTurnstile,
	showPendingHint,
	showMissingTokenErrorHint,
	captureTurnstileError,
	HEADER,
	ACTIONS
} = useTurnstile()

async function submit(event: FormSubmitEvent<Schema>) {
	const inviteToken = typeof route.query.token === 'string' ? route.query.token : ''

	if (!inviteToken) {
		toast.add({
			title: 'Uitnodigingslink ontbreekt.',
			color: 'error',
			icon: getIcon('error')
		})
		return
	}

	loading.value = true

	try {
		// Wait for turnstile to be ready and get token
		if (!isReady()) {
			showPendingHint()
		}

		const token = await getTokenWithRetry()
		if (isTurnstileEnabled.value && !token) {
			showMissingTokenErrorHint()
			return
		}

		await apiFetch('/api/access-links/invite/accept', {
			method: 'POST',
			body: { ...event.data, token, inviteToken },
			headers: isTurnstileEnabled.value && token ? { [HEADER]: token } : undefined
		})
		await fetch()
		await navigateTo('/app/lists')
	} catch (error) {
		if (captureTurnstileError(error)) {
			return
		}
		toast.add({
			title:
				error && typeof error === 'object' && 'message' in error
					? String((error as { message?: string }).message)
					: 'Uitnodiging kon niet worden gebruikt.',
			color: 'error',
			icon: getIcon('error')
		})
	} finally {
		loading.value = false
		resetTurnstile(turnstileRef.value)
	}
}
</script>

<template>
	<UContainer class="py-12 sm:py-16 md:py-24">
		<UPageCard class="mx-auto w-full max-w-md">
			<UForm :schema="schema" :state="state" class="space-y-4" @submit="submit">
				<AppLogo class="mx-auto h-12 w-auto shrink-0" />
				<NuxtTurnstile
					ref="turnstile"
					v-model="turnstileToken"
					:options="{
						action: ACTIONS.join_household,
						appearance: 'interaction-only'
					}"
					class="pointer-events-none absolute h-0 w-0 overflow-hidden opacity-0"
				/>
				<UFormField label="Naam" name="name" size="xl">
					<UInput v-model="state.name" />
				</UFormField>
				<UFormField label="E-mail" name="email" size="xl">
					<UInput v-model="state.email" type="email" />
				</UFormField>
				<UFormField label="Wachtwoord" name="password" size="xl">
					<UInput v-model="state.password" type="password" />
				</UFormField>
				<UButton type="submit" block :loading="loading">Meedoen</UButton>
			</UForm>
		</UPageCard>
	</UContainer>
</template>
