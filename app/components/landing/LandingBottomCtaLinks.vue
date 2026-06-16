<script setup lang="ts">
import type { ButtonProps } from '@nuxt/ui'

const { getIcon } = useIcon()
const { loggedIn } = useUserSession()
const { enablePublicRegistration } = useRuntimeConfig().public

const links = computed<Array<ButtonProps>>(() => [
	{
		label: loggedIn.value
			? 'Open app'
			: enablePublicRegistration
				? 'Start free trial'
				: 'Login',
		color: 'primary',
		to: loggedIn.value ? '/app' : enablePublicRegistration ? '/register' : '/login',
		trailingIcon: getIcon('right')
	},
	{
		label: 'Explore self-hosting',
		color: 'neutral',
		variant: 'subtle',
		trailingIcon: getIcon('cloud'),
		to: 'https://github.com/remihuigen/pantrypanic'
	}
])
</script>

<template>
	<UButton v-for="link in links" :key="link.label" v-bind="link" size="xl" />
</template>
