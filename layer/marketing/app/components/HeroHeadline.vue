<template>
	<h1 class="text-5xl font-bold sm:text-7xl lg:text-8xl">
		<span
			class="animate-shimmer shimmer-text bg-size-[200%_auto] bg-clip-text text-transparent"
		>
			<slot />
		</span>
	</h1>
</template>

<style lang="postcss" scoped>
.shimmer-text {
	animation-duration: 0ms;
	background-image: linear-gradient(
		135deg,
		var(--ui-text-highlighted),
		var(--ui-text),
		var(--color-primary-500),
		var(--ui-text),
		var(--ui-text-highlighted)
	);
}
.dark {
	.shimmer-text {
		background-image: linear-gradient(
			135deg,
			var(--color-primary-300),
			var(--color-primary-200),
			var(--color-primary-100),
			var(--color-primary-50),
			var(--color-primary-100),
			var(--color-primary-200),
			var(--color-primary-300)
		);
	}
}
</style>
