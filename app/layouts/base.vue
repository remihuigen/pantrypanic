<script lang="ts" setup>
const { staggerMotion } = useMotion()

const { loggedIn } = useUserSession()
</script>

<template>
	<div class="flex min-h-screen grow flex-col">
		<UHeader :toggle="false" :ui="{ right: 'space-x-4' }">
			<template #left>
				<NuxtLink to="/">
					<AppLogo class="h-9 w-auto shrink-0" />
				</NuxtLink>
			</template>

			<template #right>
				<UColorModeButton />
				<UButton v-if="loggedIn" label="Open app" color="primary" to="/app" />
			</template>
		</UHeader>

		<UMain class="flex min-h-auto grow flex-col justify-center">
			<Motion
				as="div"
				v-bind="staggerMotion(0)"
				class="absolute inset-x-0 top-0 max-h-screen overflow-hidden"
			>
				<HeroShaders class="h-[130vh] opacity-30 dark:opacity-25" />
			</Motion>

			<NuxtPage />
		</UMain>

		<Footer />
	</div>
</template>
