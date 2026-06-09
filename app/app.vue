<script lang="ts" setup>
import { nl } from '@nuxt/ui/locale'

useHead({
	meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }],
	link: [{ rel: 'icon', href: '/favicon.ico' }],
	htmlAttrs: {
		lang: 'en'
	}
})

const { identity } = useRuntimeConfig().public

const title = identity.title
const description = identity.description
const { loggedIn, user } = useUserSession()

useSeoMeta({
	title,
	description,
	ogTitle: title,
	ogDescription: description,
	twitterCard: 'summary_large_image'
})
</script>

<template>
	<UApp :locale="nl">
		<UHeader>
			<template #left>
				<NuxtLink to="/">
					<AppLogo class="h-9 w-auto shrink-0" />
				</NuxtLink>
			</template>

			<template #right>
				<span
					v-if="loggedIn && user"
					class="text-muted hidden max-w-52 truncate text-sm sm:inline"
				>
					{{ user.email }}
				</span>

				<UColorModeButton />

				<UButton
					v-if="loggedIn"
					to="/logout"
					icon="i-lucide-log-out"
					label="Log out"
					color="neutral"
					variant="ghost"
				/>
			</template>
		</UHeader>

		<UMain>
			<NuxtPage />
		</UMain>

		<USeparator
			:avatar="{
				src: '/separator_icon.png',
				size: 'lg',
				class: 'object-contain',
				ui: { root: 'bg-transparent' }
			}"
		/>

		<UFooter :ui="{ root: 'mb-3' }">
			<template #left>
				<p class="text-muted text-sm">
					{{ identity.title }} • © {{ new Date().getFullYear() }}
				</p>
			</template>
			<template #right>
				<p class="text-muted text-sm">{{ identity.description }}</p>
			</template>
		</UFooter>
	</UApp>
</template>
