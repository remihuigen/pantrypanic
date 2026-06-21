<script setup lang="ts">
import { getIcon } from '#shared/utils/icons'

definePageMeta({ layout: 'app' })

const settingsStore = useSettingsStore()
const toast = useToast()
const isLoadingCategories = shallowRef(true)

const showCategoriesSkeleton = computed(
	() => isLoadingCategories.value && settingsStore.categories.length === 0
)

onMounted(() => {
	void loadCategories()
})

async function loadCategories() {
	isLoadingCategories.value = true

	try {
		await settingsStore.fetchHouseholds()

		if (!settingsStore.activeHouseholdId) {
			return
		}

		await settingsStore.fetchCategories()
	} catch (error) {
		toast.add({
			title:
				error && typeof error === 'object' && 'message' in error
					? String((error as { message?: string }).message)
					: 'Categorieën konden niet worden geladen.',
			color: 'error',
			icon: getIcon('error')
		})
	} finally {
		isLoadingCategories.value = false
	}
}
</script>

<template>
	<div class="space-y-4">
		<div v-if="showCategoriesSkeleton" class="space-y-4">
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
