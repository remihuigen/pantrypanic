<script lang="ts" setup>
import type { FooterColumn } from '@nuxt/ui'

const { identity, enableMarketing } = useRuntimeConfig().public

const { data } = await useAsyncData<{
	blog: { label: string; to: string }[]
	legal: { label: string; to: string }[]
}>('dynamic-footer-data', () => $fetch('/api/content/footer'))

const columns: FooterColumn[] = [
	{
		label: 'App',
		children: [
			{
				label: 'Start Free Trial',
				to: '/register'
			},
			{
				label: 'Download App',
				to: '/download'
			},
			{
				label: 'Sign In',
				to: '/login'
			}
		]
	},
	{
		label: 'Notes from Ailse 7',
		children: data.value?.blog || []
	},
	{
		label: 'The Fine Print',
		children: data.value?.legal || []
	}
]
</script>

<template>
	<UFooter
		:ui="{
			root: 'mb-3',
			right: 'space-x-4',
			top: 'pb-0 lg:pb-0 space-y-8 sm:space-y-12'
		}"
	>
		<template #top>
			<UContainer v-if="enableMarketing">
				<UFooterColumns :columns="columns" :ui="{ root: 'xl:block' }" />
			</UContainer>
			<USeparator>
				<AppIcon class="w-6" />
			</USeparator>
		</template>
		<template #left>
			<p class="text-muted text-sm">
				{{ identity.title }} • © {{ new Date().getFullYear() }}
			</p>
		</template>
		<template #right>
			<p class="text-muted text-sm">{{ identity.description }}</p>
			<UButton
				to="https://github.com/remihuigen/pantrypanic"
				icon="mdi:github"
				variant="ghost"
				color="neutral"
			/>
		</template>
	</UFooter>
</template>
