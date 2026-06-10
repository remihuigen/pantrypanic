<script lang="ts" setup></script>

<template>
	<div class="pb-20">
		<EditItemDrawer />
		<AppNavigation class="z-10" />
		<UContainer class="flex min-h-screen flex-col">
			<slot />
		</UContainer>
		<Footer />
	</div>
</template>
