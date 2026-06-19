<script lang="ts" setup>
import { getIcon } from '#shared/utils/icons'

const settingsStore = useSettingsStore()
const toast = useToast()

onMounted(async () => {
	try {
		await settingsStore.fetchAll()
	} catch (error) {
		toast.add({
			title:
				error && typeof error === 'object' && 'message' in error
					? String((error as { message?: string }).message)
					: 'Instellingen konden niet worden geladen.',
			color: 'error',
			icon: getIcon('error')
		})
	}
})
</script>

<template>
	<div class="space-y-12">
		<SettingsProfileSection />
		<SettingsAppSection :show-refresh="false" />
		<SettingsDataSection />
	</div>
</template>
