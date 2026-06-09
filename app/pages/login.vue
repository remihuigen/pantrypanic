<script lang="ts" setup>
import * as z from 'zod'

const loginSchema = z.object({
	email: z.string().email({ message: 'Ongeldig e-mailadres.' }),
	password: z.string().min(1, { message: 'Wachtwoord is verplicht.' })
})

type LoginSchema = z.output<typeof loginSchema>

const route = useRoute()
const { fetch, loggedIn } = useUserSession()
const loading = ref(false)
const errorMessage = ref('')
const state = reactive<LoginSchema>({
	email: '',
	password: ''
})

const redirectPath = computed(() => {
	const redirect = route.query.redirect

	if (
		typeof redirect === 'string' &&
		redirect.startsWith('/') &&
		!redirect.startsWith('//') &&
		redirect !== '/login'
	) {
		return redirect
	}

	return '/'
})

onMounted(async () => {
	await fetch()

	if (loggedIn.value) {
		await navigateTo(redirectPath.value)
	}
})

async function onSubmit() {
	loading.value = true
	errorMessage.value = ''

	try {
		await $fetch('/api/auth/login', {
			method: 'POST',
			body: state
		})
		await fetch()
		await navigateTo(redirectPath.value)
	} catch {
		errorMessage.value = 'Ongeldig e-mailadres of wachtwoord.'
	} finally {
		loading.value = false
	}
}
</script>

<template>
	<UContainer class="flex min-h-[calc(100vh-9rem)] items-center justify-center py-10">
		<UCard class="w-full max-w-sm">
			<template #header>
				<div class="space-y-4">
					<AppLogo class="mx-auto h-12 w-auto shrink-0" />
					<p class="text-muted text-center text-sm">
						Log in met je Pantry Panic account.
					</p>
				</div>
			</template>

			<UAlert
				v-if="errorMessage"
				class="mb-4"
				color="error"
				icon="i-lucide-circle-alert"
				:title="errorMessage"
				variant="soft"
			/>

			<UForm :schema="loginSchema" :state="state" class="space-y-4" @submit="onSubmit">
				<UFormField label="Email" name="email" size="xl">
					<UInput
						v-model="state.email"
						autocomplete="email"
						class="w-full"
						type="email"
					/>
				</UFormField>

				<UFormField label="Password" name="password" size="xl">
					<UInput
						v-model="state.password"
						autocomplete="current-password"
						class="w-full"
						type="password"
					/>
				</UFormField>

				<UButton
					block
					icon="i-lucide-log-in"
					:loading="loading"
					label="Inloggen"
					size="xl"
					type="submit"
				/>
			</UForm>
		</UCard>
	</UContainer>
</template>
