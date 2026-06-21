<script lang="ts" setup>
import { getIcon } from '#shared/utils/icons'

definePageMeta({ layout: 'app' })

const settingsStore = useSettingsStore()
const toast = useToast()
const isLoadingVault = shallowRef(true)

const showItemVaultSkeleton = computed(
	() => isLoadingVault.value && settingsStore.items.length === 0
)

onMounted(() => {
	void loadItemVault()
})

async function loadItemVault() {
	isLoadingVault.value = true

	try {
		await settingsStore.fetchHouseholds()

		if (!settingsStore.activeHouseholdId) {
			return
		}

		await Promise.all([settingsStore.fetchItems(), settingsStore.fetchCategories()])
	} catch (error) {
		toast.add({
			title:
				error && typeof error === 'object' && 'message' in error
					? String((error as { message?: string }).message)
					: 'Items konden niet worden geladen.',
			color: 'error',
			icon: getIcon('error')
		})
	} finally {
		isLoadingVault.value = false
	}
}
</script>

<template>
	<div class="space-y-4">
		<div v-if="showItemVaultSkeleton" class="space-y-4">
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
