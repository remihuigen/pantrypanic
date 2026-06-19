<script lang="ts" setup>
import { getIcon } from '#shared/utils/icons'

withDefaults(defineProps<{ useShaders?: boolean }>(), { useShaders: true })

const { staggerMotion } = useMotion()

const { loggedIn } = useUserSession()

const { enableBetaPeriod, enableMarketing } = useRuntimeConfig().public

</script>

<template>
	<div class="flex min-h-screen grow flex-col">
		<UHeader :toggle="false" :ui="{ right: 'space-x-4' }">
			<template #left>
				<NuxtLink to="/" class="relative -top-0.75">
					<AppLogo class="h-9 w-auto shrink-0" />
				</NuxtLink>
				<UBadge
					v-if="enableBetaPeriod"
					color="neutral"
					variant="soft"
					label="beta"
					size="sm"
					class="bg-success-50! relative top-0.5 ml-3 gap-1.5 rounded-full bg-white/5 px-2 py-1 backdrop-blur select-none dark:bg-neutral-800!"
				>
					<template #leading>
						<UChip
							inset
							standalone
							color="success"
							:ui="{ base: 'animate-pulse ring-0' }"
						/>
					</template>
				</UBadge>
			</template>

			<template #right>
				<UButton
					v-if="enableMarketing"
					label="Blog"
					color="neutral"
					variant="ghost"
					size="lg"
					to="/blog"
					class="font-bold"
					:icon="getIcon('blog')"
					:ui="{ leadingIcon: 'size-4' }"
				/>
				<UButton
					:label="loggedIn ? 'Open app' : 'Sign in'"
					color="primary"
					:to="loggedIn ? '/app' : '/login'"
					size="lg"
					class="font-bold"
				/>
				<UColorModeButton />
			</template>
		</UHeader>

		<UMain class="flex min-h-auto grow flex-col justify-center">
			<Motion
				as="div"
				v-bind="staggerMotion(0)"
				class="absolute inset-x-0 top-0 max-h-screen overflow-hidden"
			>
				<HeroShaders v-if="useShaders" class="h-[130vh] opacity-30 dark:opacity-25" />
			</Motion>

			<NuxtPage />
		</UMain>

		<Footer />
	</div>
</template>
