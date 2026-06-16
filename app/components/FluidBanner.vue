<script lang="ts" setup>
withDefaults(
	defineProps<{ color?: 'primary' | 'secondary' | 'neutral'; containerClass?: string }>(),
	{
		color: 'primary'
	}
)

const background = {
	primary:
		'from-primary-100/20 to-primary-100/80 dark:from-neutral-950/50 dark:to-primary-900/20',
	secondary:
		'from-secondary-100/40 to-secondary-200/80 dark:from-neutral-950 dark:to-secondary-900/60',
	neutral: 'from-neutral-50 to-neutral-200/80 dark:from-neutral-950 dark:to-neutral-800/80'
}
</script>

<template>
	<Fluid class="flex-col items-center px-3 sm:px-4">
		<FluidInnerContainer
			class="mx-auto rounded-2xl bg-radial-[at_20%_20%] from-20% px-1 py-8 sm:px-2 md:py-16"
			:class="background[color]"
		>
			<UContainer class="relative" :class="containerClass">
				<slot />
			</UContainer>
		</FluidInnerContainer>
	</Fluid>
</template>
