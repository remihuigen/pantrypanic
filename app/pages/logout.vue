<script lang="ts" setup>
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
		<div class="flex items-center gap-3 text-sm text-muted">
			<UIcon
				class="size-5 animate-spin"
				name="i-lucide-loader-circle"
			/>
			<span>Signing out</span>
		</div>
	</UContainer>
</template>
