<script setup lang="ts">
const { getIcon } = useIcon()
const { loggedIn } = useUserSession()
</script>

<template>
	<div class="flex items-center gap-3 flex-wrap">
		<UButton
			size="xl"
			color="primary"
			:label="loggedIn ? 'Open app' : 'Start free trial'"
			:to="loggedIn ? '/app/lists' : undefined"
			:trailing-icon="getIcon('right')"
			:ui="{ trailingIcon: 'size-4' }"
		/>
		<UButton
			v-if="!loggedIn"
			size="xl"
			color="neutral"
			variant="link"
			label="login with account"
			to="/login"
		/>
	</div>
</template>
