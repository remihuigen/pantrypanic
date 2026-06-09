<script lang="ts" setup>
useHead({
	meta: [
		{ name: 'viewport', content: 'width=device-width, initial-scale=1' }
	],
	link: [
		{ rel: 'icon', href: '/favicon.ico' }
	],
	htmlAttrs: {
		lang: 'en'
	}
})

const title = 'Pantry Panic'
const description = 'A pantry-first meal planning app for reducing food waste.'
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
	<UApp>
		<UHeader>
			<template #left>
				<NuxtLink to="/">
					<AppLogo class="h-6 w-auto shrink-0" />
				</NuxtLink>

				<TemplateMenu v-if="loggedIn" />
			</template>

			<template #right>
				<span
					v-if="loggedIn && user"
					class="hidden max-w-52 truncate text-sm text-muted sm:inline"
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

		<USeparator icon="i-lucide-utensils" />

		<UFooter>
			<template #left>
				<p class="text-sm text-muted">
					Pantry Panic • © {{ new Date().getFullYear() }}
				</p>
			</template>
		</UFooter>
	</UApp>
</template>
