<script lang="ts" setup></script>

<template>
	<section class="space-y-4 py-6">
		<slot name="header" />
		<ClientOnly>
			<slot />

			<template #fallback> Loading stuff </template>
		</ClientOnly>
	</section>
</template>
