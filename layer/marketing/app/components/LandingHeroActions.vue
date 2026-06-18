<script setup lang="ts">
import type { ButtonProps } from '@nuxt/ui'

const { getIcon } = useIcon()
const { loggedIn } = useUserSession()
const { enablePublicRegistration } = useRuntimeConfig().public

const actions = computed(() => {
	const items: ButtonProps[] = []
	if (loggedIn.value) {
		items.push({
			color: 'primary',
			to: '/app',
			label: 'Open app',
			trailingIcon: getIcon('right')
		})
		return items
	}

	if (enablePublicRegistration) {
		items.push({
			color: 'primary',
			to: '/register',
			label: 'Start free trial',
			trailingIcon: getIcon('right')
		})
		items.push({
			color: 'neutral',
			variant: 'link',
			to: '/login',
			label: 'Login with account'
		})
	}

	if (!enablePublicRegistration) {
		items.push({
			color: 'primary',
			to: '/login',
			label: 'Go to login',
			trailingIcon: getIcon('right')
		})
	}
	return items
})
</script>

<template>
	<div class="flex flex-wrap items-center gap-3">
		<UButton
			v-for="item in actions"
			:key="item.label"
			v-bind="item"
			size="xl"
			:ui="{ trailingIcon: 'size-4' }"
		/>
	</div>
</template>
