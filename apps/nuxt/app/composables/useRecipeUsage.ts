type RecipeUsageCountsByUser = Record<string, Record<string, number>>

const RECIPE_USAGE_STORAGE_KEY = 'pantrypanic:recipe-usage-counts'

/**
 * Tracks per-user recipe usage counts in local browser storage.
 *
 * @returns Usage count state and mutation helpers.
 */
export function useRecipeUsage() {
	const settingsStore = useSettingsStore()
	const usageCountsByUser = useLocalStorage<RecipeUsageCountsByUser>(
		RECIPE_USAGE_STORAGE_KEY,
		{}
	)

	const userUsageKey = computed(() => String(settingsStore.profile?.id ?? 'anonymous'))
	const usageCounts = computed(() => usageCountsByUser.value[userUsageKey.value] ?? {})

	function getUsageCount(recipeId: string) {
		return usageCounts.value[recipeId] ?? 0
	}

	function incrementUsage(recipeId: string) {
		const currentUserUsage = usageCounts.value

		usageCountsByUser.value = {
			...usageCountsByUser.value,
			[userUsageKey.value]: {
				...currentUserUsage,
				[recipeId]: (currentUserUsage[recipeId] ?? 0) + 1
			}
		}
	}

	return {
		usageCounts,
		getUsageCount,
		incrementUsage
	}
}
