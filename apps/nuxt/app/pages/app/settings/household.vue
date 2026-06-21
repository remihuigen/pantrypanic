<script lang="ts" setup>
import { getIcon } from '#shared/utils/icons'

const settingsStore = useSettingsStore()
const toast = useToast()

onMounted(async () => {
	try {
		await Promise.all([settingsStore.fetchProfile(), settingsStore.fetchHouseholds()])

		if (!settingsStore.activeHouseholdId) return

		await Promise.all([settingsStore.fetchMembers(), settingsStore.fetchSettings()])
	} catch (error) {
		toast.add({
			title:
				error && typeof error === 'object' && 'message' in error
					? String((error as { message?: string }).message)
					: 'Huishouden kon niet worden geladen.',
			color: 'error',
			icon: getIcon('error')
		})
	}
})
</script>

<template>
	<div class="space-y-4">
		<SettingsHouseholdSection />
		<SettingsHouseholdConfigSettings
			v-if="settingsStore.activeHouseholdId"
			:show-theme="false"
		/>
	</div>
</template>
