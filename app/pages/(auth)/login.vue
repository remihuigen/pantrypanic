<script lang="ts" setup>
import type { AuthFormField, FormSubmitEvent } from '@nuxt/ui'
import { getIcon } from '#shared/utils/icons'

import { z } from 'zod'

definePageMeta({
	layout: 'base'
})

useSeoMeta({
	title: 'Log in bij Pantry Panic',
	ogTitle: 'Log in bij Pantry Panic',
	description:
		'Log in bij je Pantry Panic account en beheer je boodschappenlijsten, recepten en meer.',
	ogDescription:
		'Log in bij je Pantry Panic account en beheer je boodschappenlijsten, recepten en meer.'
})

const loginSchema = z.object({
	email: z.email({ error: 'Ongeldig e-mailadres.' }),
	password: z
		.string({ error: 'Wachtwoord is verplicht.' })
		.min(8, { error: 'Wachtwoord moet minimaal 8 tekens bevatten.' })
})

type Schema = z.output<typeof loginSchema>

const toast = useToast()

const fields: AuthFormField[] = [
	{
		name: 'email',
		type: 'email',
		label: 'Email',
		placeholder: 'Voer je e-mailadres in',
		required: true,
		size: 'lg'
	},
	{
		name: 'password',
		label: 'Wachtwoord',
		type: 'password',
		placeholder: 'Voer je wachtwoord in',
		required: true,
		size: 'lg'
	}
]

const route = useRoute()
const { fetch, loggedIn } = useUserSession()
const loading = ref(false)

const redirectPath = computed(() => {
	const redirect = route.query.redirect

	if (
		typeof redirect === 'string' &&
		(redirect === '/app' || redirect.startsWith('/app/')) &&
		!redirect.startsWith('//')
	) {
		return redirect
	}

	return '/app/lists'
})

onMounted(async () => {
	await fetch()

	if (loggedIn.value) {
		await navigateTo(redirectPath.value)
	}
})

async function onSubmit(payload: FormSubmitEvent<Schema>) {
	loading.value = true

	try {
		await $fetch('/api/auth/login', {
			method: 'POST',
			body: payload.data
		})
		await fetch()
		await navigateTo(redirectPath.value)
	} catch {
		toast.add({
			title: 'Ongeldig e-mailadres of wachtwoord.',
			color: 'error',
			duration: 8000,
			icon: getIcon('error')
		})
	} finally {
		loading.value = false
	}
}

const { enablePublicRegistration } = useRuntimeConfig().public
</script>

<template>
	<UContainer>
		<UPageCard class="mx-auto w-full max-w-md">
			<UAuthForm
				:schema="loginSchema"
				title="Welkom terug"
				description="Log in met je Pantry Panic account."
				:fields="fields"
				:ui="{
					title: 'mb-4'
				}"
				@submit="onSubmit"
			>
				<template #title>
					<AppLogo class="mx-auto h-12 w-auto shrink-0" />
				</template>
			</UAuthForm>
			<UButton
				v-if="enablePublicRegistration"
				color="neutral"
				variant="link"
				class="mx-auto mt-4 mb-3"
				to="/register"
				>Of registreer je huishouden</UButton
			>
		</UPageCard>
	</UContainer>
</template>
