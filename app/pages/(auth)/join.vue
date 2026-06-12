<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'

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

type Schema = z.output<typeof schema>

const route = useRoute()
const toast = useToast()
const { fetch } = useUserSession()
const loading = ref(false)
const state = reactive<Schema>({
	name: '',
	email: '',
	password: ''
})

async function submit(event: FormSubmitEvent<Schema>) {
	const token = typeof route.query.token === 'string' ? route.query.token : ''

	if (!token) {
		toast.add({
			title: 'Uitnodigingslink ontbreekt.',
			color: 'error',
			icon: 'i-lucide-circle-alert'
		})
		return
	}

	loading.value = true

	try {
		await apiFetch('/api/access-links/invite/accept', {
			method: 'POST',
			body: { ...event.data, token }
		})
		await fetch()
		await navigateTo('/app/lists')
	} catch (error) {
		toast.add({
			title:
				error && typeof error === 'object' && 'message' in error
					? String((error as { message?: string }).message)
					: 'Uitnodiging kon niet worden gebruikt.',
			color: 'error',
			icon: 'i-lucide-circle-alert'
		})
	} finally {
		loading.value = false
	}
}
</script>

<template>
	<UContainer>
		<UPageCard class="mx-auto w-full max-w-md">
			<UForm :schema="schema" :state="state" class="space-y-4" @submit="submit">
				<AppLogo class="mx-auto h-12 w-auto shrink-0" />
				<UFormField label="Naam" name="name">
					<UInput v-model="state.name" />
				</UFormField>
				<UFormField label="E-mail" name="email">
					<UInput v-model="state.email" type="email" />
				</UFormField>
				<UFormField label="Wachtwoord" name="password">
					<UInput v-model="state.password" type="password" />
				</UFormField>
				<UButton type="submit" block :loading="loading">Meedoen</UButton>
			</UForm>
		</UPageCard>
	</UContainer>
</template>
