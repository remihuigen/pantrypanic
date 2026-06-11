<script lang="ts" setup></script>

<template>
	<section class="space-y-4 py-6">
		<slot name="header" />
		<ClientOnly>
			<slot />

			<template #fallback>
				<div class="grid h-[80vh] place-items-center">
					<AppIcon class="w-16 animate-pulse" />
				</div>
			</template>
		</ClientOnly>
	</section>
</template>
