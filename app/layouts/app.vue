<script lang="ts" setup></script>

<template>
	<div class="pb-20">
		<AppNavigation class="z-10" />
		<UContainer class="min-h-screen">
			<slot />
		</UContainer>
		<Footer />
	</div>
</template>
