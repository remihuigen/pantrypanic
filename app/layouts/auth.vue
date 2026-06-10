<script lang="ts" setup></script>

<template>
	<div class="flex min-h-auto grow flex-col">
		<UHeader :toggle="false">
			<template #left>
				<NuxtLink to="/">
					<AppLogo class="h-9 w-auto shrink-0" />
				</NuxtLink>
			</template>

			<template #right>
				<UColorModeButton />
			</template>
		</UHeader>

		<UMain class="flex min-h-auto grow flex-col justify-center">
			<NuxtPage />
		</UMain>
	</div>
</template>
