<script setup lang="ts">
definePageMeta({ layout: 'app' })

const settingsStore = useSettingsStore()
const toast = useToast()
const hasResolvedInitialLoad = ref(false)

const categoriesRequest = useLazyAsyncData(
	'settings-categories',
	async () => {
		await settingsStore.fetchHouseholds()

		if (!settingsStore.activeHouseholdId) {
			return
		}

		await settingsStore.fetchCategories()
	},
	{
		server: false
	}
)

const isInitialLoadPending = computed(
	() => categoriesRequest.status.value === 'pending' && !hasResolvedInitialLoad.value
)

watch(
	() => categoriesRequest.status.value,
	(status) => {
		if (status === 'success' || status === 'error') {
			hasResolvedInitialLoad.value = true
		}
	},
	{ immediate: true }
)

watch(
	() => categoriesRequest.error.value,
	(error) => {
		if (!error) {
			return
		}

		toast.add({
			title:
				error && typeof error === 'object' && 'message' in error
					? String((error as { message?: string }).message)
					: 'Categorieën konden niet worden geladen.',
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
			<USkeleton class="h-24 w-full rounded-xl" />
			<div class="grid gap-3">
				<USkeleton class="h-32 w-full rounded-xl" />
				<USkeleton class="h-32 w-full rounded-xl" />
				<USkeleton class="h-32 w-full rounded-xl" />
			</div>
		</div>

		<SettingsCategoriesSection v-else-if="settingsStore.activeHouseholdId" />
	</div>
</template>
