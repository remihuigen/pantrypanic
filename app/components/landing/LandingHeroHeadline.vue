<script setup lang="ts">
const colorMode = useColorMode()
</script>

<template>
	<h1 class="text-5xl font-bold sm:text-7xl lg:text-8xl">
		<span
			class="animate-shimmer bg-size-[200%_auto] bg-clip-text text-transparent"
			:style="{
				backgroundImage:
					colorMode.value === 'dark'
						? 'linear-gradient(135deg, var(--color-primary-300), var(--color-primary-200), var(--color-primary-100), var(--color-primary-50), var(--color-primary-100), var(--color-primary-200), var(--color-primary-300))'
						: 'linear-gradient(135deg, var(--ui-text-highlighted), var(--ui-text), var(--color-primary-500), var(--ui-text), var(--ui-text-highlighted))',
				animationDuration: '10s'
			}"
		>
			For <strong class="font-black">calm</strong>
			<br />
			grocery runs
		</span>
	</h1>
</template>
