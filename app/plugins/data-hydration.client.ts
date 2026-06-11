import { useListsStore } from '~/stores/lists'
import { useMealPlannerStore } from '~/stores/meal-planner'
import { useRecipesStore } from '~/stores/recipes'
import { useSettingsStore } from '~/stores/settings'

export default defineNuxtPlugin(async () => {
	const listsStore = useListsStore()
	const recipesStore = useRecipesStore()
	const mealPlannerStore = useMealPlannerStore()
	const settingsStore = useSettingsStore()
	const { user, fetch } = useUserSession()

	await fetch().catch(() => undefined)

	if (!user.value) {
		listsStore.stopOverviewRefresh()
		recipesStore.stopRecipesRefresh()
		mealPlannerStore.stopRefresh()
		return
	}

	await Promise.allSettled([
		settingsStore.fetchSettings(),
		listsStore.fetchLists('active'),
		listsStore.fetchSuggestions(),
		recipesStore.fetchRecipes({ status: 'active' }),
		mealPlannerStore.fetchMealPlanner()
	])

	await Promise.allSettled([
		listsStore.startOverviewRefresh(),
		recipesStore.startRecipesRefresh(),
		mealPlannerStore.startRefresh()
	])
})
