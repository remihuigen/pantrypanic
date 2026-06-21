<script lang="ts" setup>
import { getIcon } from '#shared/utils/icons'

definePageMeta({ layout: 'base' })
const { clear } = useUserSession()

onMounted(async () => {
	try {
		await $fetch('/api/auth/logout', {
			method: 'POST'
		})
	} finally {
		await clear()
		await navigateTo('/login')
	}
})
</script>

<template>
	<UContainer class="flex min-h-[calc(100vh-9rem)] items-center justify-center py-10">
		<div class="text-muted flex items-center gap-3 text-sm">
			<UIcon class="size-5 animate-spin" :name="getIcon('loaderCircle')" />
			<span>Je wordt uitgelogd...</span>
		</div>
	</UContainer>
</template>
