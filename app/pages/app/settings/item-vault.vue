<script lang="ts" setup>
definePageMeta({ layout: 'app' })

const settingsStore = useSettingsStore()
const toast = useToast()
const hasResolvedInitialLoad = ref(false)

const itemVaultRequest = useLazyAsyncData(
	'settings-item-vault',
	async () => {
		await settingsStore.fetchHouseholds()
		if (!settingsStore.activeHouseholdId) {
			return
		}

		await Promise.all([settingsStore.fetchItems(), settingsStore.fetchCategories()])
	},
	{
		server: false
	}
)

const isInitialLoadPending = computed(
	() => itemVaultRequest.status.value === 'pending' && !hasResolvedInitialLoad.value
)

watch(
	() => itemVaultRequest.status.value,
	(status) => {
		if (status === 'success' || status === 'error') {
			hasResolvedInitialLoad.value = true
		}
	},
	{ immediate: true }
)

watch(
	() => itemVaultRequest.error.value,
	(error) => {
		if (!error) {
			return
		}

		toast.add({
			title:
				error && typeof error === 'object' && 'message' in error
					? String((error as { message?: string }).message)
					: 'Items konden niet worden geladen.',
			color: 'error',
			icon: 'i-lucide-circle-alert'
		})
	}
)
</script>

<template>
	<div class="space-y-4">
		<div v-if="isInitialLoadPending" class="space-y-4">
			<USkeleton class="h-9 w-56" />
			<USkeleton class="h-11 w-full max-w-120" />
			<div class="grid gap-3">
				<USkeleton class="h-38 w-full rounded-xl" />
				<USkeleton class="h-38 w-full rounded-xl" />
				<USkeleton class="h-38 w-full rounded-xl" />
			</div>
		</div>

		<SettingsItemsSection v-else-if="settingsStore.activeHouseholdId" />
	</div>
</template>
