<script lang="ts" setup></script>

<template>
	<main class="relative flex min-h-[calc(100vh-150px)] flex-col">
		<slot name="hero" />

		<Fluid>
			<USeparator />
		</Fluid>
		<UPageBody class="my-0! py-0!">
			<UContainer>
				<div class="border-default gap-0! border-x">
					<slot />
				</div>
			</UContainer>
		</UPageBody>

		<UContainer class="relative -mb-3.5 min-h-12 grow">
			<div
				aria-hidden="true"
				class="border-default absolute inset-0 z-[-1] mx-4 border-x sm:mx-6 lg:mx-8"
			/>
		</UContainer>
	</main>
</template>
