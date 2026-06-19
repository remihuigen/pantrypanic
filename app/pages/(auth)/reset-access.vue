<script setup lang="ts">
import { getIcon } from '#shared/utils/icons'

definePageMeta({ layout: 'base' })

const route = useRoute()
const toast = useToast()
const { fetch } = useUserSession()
const loading = ref(true)

useSeoMeta({
	title: 'Krijg toegang tot Pantry Panic',
	ogTitle: 'Krijg toegang tot Pantry Panic',
	description:
		'Krijg toegang tot je Pantry Panic account en beheer je boodschappenlijsten, recepten en meer.',
	ogDescription:
		'Krijg toegang tot je Pantry Panic account en beheer je boodschappenlijsten, recepten en meer.'
})

onMounted(async () => {
	const token = typeof route.query.token === 'string' ? route.query.token : ''

	if (!token) {
		loading.value = false
		toast.add({
			title: 'Toegangslink ontbreekt.',
			color: 'error',
			icon: getIcon('error')
		})
		return
	}

	try {
		await apiFetch('/api/access-links/reset/accept', {
			method: 'POST',
			body: { token }
		})
		await fetch()
		await navigateTo('/app/settings?reset=password')
	} catch (error) {
		toast.add({
			title:
				error && typeof error === 'object' && 'message' in error
					? String((error as { message?: string }).message)
					: 'Toegangslink kon niet worden gebruikt.',
			color: 'error',
			icon: getIcon('error')
		})
	} finally {
		loading.value = false
	}
})
</script>

<template>
	<UContainer>
		<UPageCard class="mx-auto w-full max-w-md text-center">
			<AppLogo class="mx-auto h-12 w-auto shrink-0" />
			<p class="text-muted mt-4 text-sm">
				{{
					loading
						? 'Toegang wordt voorbereid...'
						: 'Deze toegangslink kan niet worden gebruikt.'
				}}
			</p>
		</UPageCard>
	</UContainer>
</template>
