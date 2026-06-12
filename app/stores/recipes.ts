import type { AppError } from '~~/shared/types/api'
import type {
	CreateRecipeInput,
	EntityMap,
	RecipeDetail,
	RecipeItem,
	RecipeStatus,
	RecipeSummary,
	UpdateOccurrenceInput,
	UpdateRecipeInput
} from '~~/shared/utils/schemas/domain'

import { useStoreRefresh } from '~/composables/useStoreRefresh'
import { apiFetch, normalizeAppError } from '~/utils/api-client'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export const useRecipesStore = defineStore(
	'recipes',
	() => {
		const recipesById = ref<EntityMap<RecipeSummary>>({})
		const activeRecipeIds = ref<string[]>([])
		const archivedRecipeIds = ref<string[]>([])
		const recipeItemsById = ref<EntityMap<RecipeItem>>({})
		const recipeItemIdsByRecipeId = ref<Record<string, string[]>>({})
		const activeRecipeId = ref<string | null>(null)
		const isLoading = ref(false)
		const isSaving = ref(false)
		const error = ref<AppError | null>(null)

		const activeRecipes = computed(() => mapByIds(recipesById.value, activeRecipeIds.value))
		const archivedRecipes = computed(() => mapByIds(recipesById.value, archivedRecipeIds.value))

		const recipesRefresh = useStoreRefresh({
			immediate: false,
			refresh: async () => {
				await fetchRecipes({ status: 'active' })
			}
		})

		const activeRecipeRefresh = useStoreRefresh({
			enabled: computed(() => Boolean(activeRecipeId.value)),
			immediate: false,
			refresh: async () => {
				if (!activeRecipeId.value) {
					return
				}

				await fetchRecipe(activeRecipeId.value)
			}
		})

		function getRecipeItems(recipeId: string) {
			return mapByIds(recipeItemsById.value, recipeItemIdsByRecipeId.value[recipeId] ?? [])
		}

		function setActiveRecipe(recipeId: string | null) {
			activeRecipeId.value = recipeId
		}

		async function openRecipe(recipeId: string) {
			setActiveRecipe(recipeId)
			await fetchRecipe(recipeId)
			await activeRecipeRefresh.start()
		}

		function closeRecipe() {
			setActiveRecipe(null)
			activeRecipeRefresh.stop()
		}

		async function startRecipesRefresh() {
			await recipesRefresh.start()
		}

		function stopRecipesRefresh() {
			recipesRefresh.stop()
		}

		async function fetchRecipes(options: { status?: RecipeStatus; q?: string } = {}) {
			isLoading.value = true
			error.value = null

			try {
				const params = new URLSearchParams({ status: options.status ?? 'active' })

				if (options.q) {
					params.set('q', options.q)
				}

				const data = await apiFetch<{ recipes: RecipeSummary[] }>(
					`/api/recipes?${params.toString()}`
				)
				const targetStatus = options.status ?? 'active'

				syncRecipeCollections(data.recipes, targetStatus)

				for (const recipe of data.recipes) {
					upsertRecipeSummary(recipe)
				}

				return data.recipes
			} catch (err) {
				const appError = normalizeAppError(err)
				error.value = appError
				throw appError
			} finally {
				isLoading.value = false
			}
		}

		async function fetchRecipe(recipeId: string) {
			isLoading.value = true
			error.value = null

			try {
				const data = await apiFetch<{ recipe: RecipeDetail }>(`/api/recipes/${recipeId}`)
				upsertRecipeDetail(data.recipe)
				setRecipeItems(recipeId, data.recipe.items)

				return data.recipe
			} catch (err) {
				const appError = normalizeAppError(err)
				error.value = appError
				throw appError
			} finally {
				isLoading.value = false
			}
		}

		async function createRecipe(input: CreateRecipeInput) {
			isSaving.value = true
			error.value = null

			try {
				const data = await apiFetch<{ recipe: RecipeDetail }>('/api/recipes', {
					method: 'POST',
					body: input
				})

				upsertRecipeDetail(data.recipe)
				setRecipeItems(data.recipe.id, data.recipe.items)

				if (!activeRecipeIds.value.includes(data.recipe.id)) {
					activeRecipeIds.value.unshift(data.recipe.id)
				}

				return data.recipe
			} catch (err) {
				const appError = normalizeAppError(err)
				error.value = appError
				throw appError
			} finally {
				isSaving.value = false
			}
		}

		async function updateRecipe(recipeId: string, input: UpdateRecipeInput) {
			isSaving.value = true
			error.value = null

			const existing = recipesById.value[recipeId]

			if (existing) {
				recipesById.value[recipeId] = {
					...existing,
					...(input.name === undefined ? {} : { name: input.name }),
					...(input.description === undefined
						? {}
						: { description: input.description ?? undefined }),
					...(input.servings === undefined
						? {}
						: { servings: input.servings ?? undefined })
				}
			}

			try {
				const data = await apiFetch<{ recipe: { id: string; updatedAt: number } }>(
					`/api/recipes/${recipeId}`,
					{
						method: 'PATCH',
						body: input
					}
				)

				const merged = recipesById.value[data.recipe.id]

				if (merged) {
					recipesById.value[data.recipe.id] = {
						...merged,
						updatedAt: data.recipe.updatedAt
					}
				}

				return data.recipe
			} catch (err) {
				if (existing) {
					recipesById.value[recipeId] = existing
				}

				const appError = normalizeAppError(err)
				error.value = appError
				throw appError
			} finally {
				isSaving.value = false
			}
		}

		async function archiveRecipe(recipeId: string) {
			isSaving.value = true
			error.value = null

			const previous = recipesById.value[recipeId]

			if (previous) {
				recipesById.value[recipeId] = {
					...previous,
					status: 'archived'
				}

				moveRecipeId(recipeId, activeRecipeIds.value, archivedRecipeIds.value)
			}

			try {
				const data = await apiFetch<{
					recipe: { id: string; status: RecipeStatus; archivedAt?: number }
				}>(`/api/recipes/${recipeId}/archive`, { method: 'POST' })

				const existing = recipesById.value[data.recipe.id]

				if (existing) {
					recipesById.value[data.recipe.id] = {
						...existing,
						status: data.recipe.status
					}
				}

				moveRecipeId(data.recipe.id, activeRecipeIds.value, archivedRecipeIds.value)

				return data.recipe
			} catch (err) {
				if (previous) {
					recipesById.value[recipeId] = previous
					moveRecipeId(recipeId, archivedRecipeIds.value, activeRecipeIds.value)
				}

				const appError = normalizeAppError(err)
				error.value = appError
				throw appError
			} finally {
				isSaving.value = false
			}
		}

		async function deleteRecipe(recipeId: string) {
			isSaving.value = true
			error.value = null

			const previousRecipe = recipesById.value[recipeId]
			const previousItemIds = [...(recipeItemIdsByRecipeId.value[recipeId] ?? [])]

			removeRecipe(recipeId)

			try {
				await apiFetch<{
					recipe: { id: string; status: RecipeStatus; deletedAt?: number }
				}>(`/api/recipes/${recipeId}/delete`, { method: 'POST' })
			} catch (err) {
				if (previousRecipe) {
					upsertRecipeSummary(previousRecipe)
					if (previousRecipe.status === 'active') {
						activeRecipeIds.value.push(previousRecipe.id)
					}
					if (previousRecipe.status === 'archived') {
						archivedRecipeIds.value.push(previousRecipe.id)
					}
				}

				if (previousItemIds.length > 0) {
					recipeItemIdsByRecipeId.value[recipeId] = previousItemIds
				}

				const appError = normalizeAppError(err)
				error.value = appError
				throw appError
			} finally {
				isSaving.value = false
			}
		}

		async function addRecipeItem(
			recipeId: string,
			input: { name: string; amount?: number; unit?: string; note?: string }
		) {
			isSaving.value = true
			error.value = null

			const temporaryId = createTemporaryId('recipe-item')
			const temporaryItemId = createTemporaryId('item')
			const optimisticItem: RecipeItem = {
				id: temporaryId,
				recipeId,
				itemId: temporaryItemId,
				name: input.name,
				amount: input.amount,
				unit: input.unit,
				note: input.note,
				position: recipeItemIdsByRecipeId.value[recipeId]?.length ?? 0
			}

			upsertRecipeItem(optimisticItem)
			appendRecipeItemId(recipeId, temporaryId)

			try {
				const data = await apiFetch<{ recipeItem: RecipeItem }>(
					`/api/recipes/${recipeId}/items`,
					{
						method: 'POST',
						body: input
					}
				)

				removeRecipeItem(recipeId, temporaryId)
				upsertRecipeItem(data.recipeItem)
				appendRecipeItemId(recipeId, data.recipeItem.id)

				return data.recipeItem
			} catch (err) {
				removeRecipeItem(recipeId, temporaryId)
				const appError = normalizeAppError(err)
				error.value = appError
				throw appError
			} finally {
				isSaving.value = false
			}
		}

		async function updateRecipeItem(recipeItemId: string, input: UpdateOccurrenceInput) {
			isSaving.value = true
			error.value = null

			const existing = recipeItemsById.value[recipeItemId]

			if (existing) {
				recipeItemsById.value[recipeItemId] = {
					...existing,
					...(input.amount === undefined ? {} : { amount: input.amount ?? undefined }),
					...(input.unit === undefined ? {} : { unit: input.unit ?? undefined }),
					...(input.note === undefined ? {} : { note: input.note ?? undefined })
				}
			}

			try {
				const data = await apiFetch<{ recipeItem: { id: string; updatedAt: number } }>(
					`/api/recipe-items/${recipeItemId}`,
					{
						method: 'PATCH',
						body: input
					}
				)

				const merged = recipeItemsById.value[data.recipeItem.id]

				if (merged) {
					recipeItemsById.value[data.recipeItem.id] = {
						...merged,
						updatedAt: data.recipeItem.updatedAt
					}
				}

				return data.recipeItem
			} catch (err) {
				if (existing) {
					recipeItemsById.value[recipeItemId] = existing
				}

				const appError = normalizeAppError(err)
				error.value = appError
				throw appError
			} finally {
				isSaving.value = false
			}
		}

		async function deleteRecipeItem(recipeItemId: string) {
			isSaving.value = true
			error.value = null

			const existing = recipeItemsById.value[recipeItemId]

			if (!existing) {
				isSaving.value = false
				return
			}

			removeRecipeItem(existing.recipeId, recipeItemId)

			try {
				await apiFetch<{ ok: true }>(`/api/recipe-items/${recipeItemId}/delete`, {
					method: 'POST'
				})
			} catch (err) {
				upsertRecipeItem(existing)
				appendRecipeItemId(existing.recipeId, existing.id)

				const appError = normalizeAppError(err)
				error.value = appError
				throw appError
			} finally {
				isSaving.value = false
			}
		}

		async function reorderRecipeItems(recipeId: string, orderedIds: string[]) {
			isSaving.value = true
			error.value = null

			const previousIds = [...(recipeItemIdsByRecipeId.value[recipeId] ?? [])]
			const previousItems = previousIds
				.map((id) => recipeItemsById.value[id])
				.filter((item): item is RecipeItem => Boolean(item))

			recipeItemIdsByRecipeId.value[recipeId] = [...orderedIds]

			for (const [position, id] of orderedIds.entries()) {
				const existing = recipeItemsById.value[id]

				if (existing) {
					recipeItemsById.value[id] = {
						...existing,
						position
					}
				}
			}

			try {
				const data = await apiFetch<{ items: Array<{ id: string; position: number }> }>(
					`/api/recipes/${recipeId}/items/reorder`,
					{
						method: 'POST',
						body: { orderedIds }
					}
				)

				for (const item of data.items) {
					const existing = recipeItemsById.value[item.id]

					if (existing) {
						recipeItemsById.value[item.id] = {
							...existing,
							position: item.position
						}
					}
				}

				return data.items
			} catch (err) {
				recipeItemIdsByRecipeId.value[recipeId] = previousIds

				for (const item of previousItems) {
					recipeItemsById.value[item.id] = item
				}

				await fetchRecipe(recipeId)

				const appError = normalizeAppError(err)
				error.value = appError
				throw appError
			} finally {
				isSaving.value = false
			}
		}

		function upsertRecipeSummary(recipe: RecipeSummary) {
			recipesById.value[recipe.id] = {
				...(recipesById.value[recipe.id] ?? {}),
				...recipe
			} as RecipeSummary
		}

		function upsertRecipeDetail(recipe: RecipeDetail) {
			upsertRecipeSummary({
				id: recipe.id,
				name: recipe.name,
				description: recipe.description,
				servings: recipe.servings,
				status: recipe.status,
				updatedAt: recipesById.value[recipe.id]?.updatedAt ?? Date.now()
			})
		}

		function upsertRecipeItem(item: RecipeItem) {
			recipeItemsById.value[item.id] = item
		}

		function setRecipeItems(recipeId: string, items: RecipeItem[]) {
			const previousIds = recipeItemIdsByRecipeId.value[recipeId] ?? []
			const nextIds: string[] = []

			for (const item of items) {
				upsertRecipeItem(item)
				nextIds.push(item.id)
			}

			for (const id of previousIds) {
				if (!nextIds.includes(id)) {
					recipeItemsById.value = omitRecordKey(recipeItemsById.value, id)
				}
			}

			recipeItemIdsByRecipeId.value[recipeId] = nextIds
		}

		function appendRecipeItemId(recipeId: string, recipeItemId: string) {
			const current = recipeItemIdsByRecipeId.value[recipeId] ?? []

			if (!current.includes(recipeItemId)) {
				recipeItemIdsByRecipeId.value[recipeId] = [...current, recipeItemId]
			}
		}

		function removeRecipeItem(recipeId: string, recipeItemId: string) {
			recipeItemsById.value = omitRecordKey(recipeItemsById.value, recipeItemId)

			const current = recipeItemIdsByRecipeId.value[recipeId] ?? []
			recipeItemIdsByRecipeId.value[recipeId] = current.filter((id) => id !== recipeItemId)
		}

		function syncRecipeCollections(recipes: RecipeSummary[], status: RecipeStatus) {
			const ids = recipes.map((recipe) => recipe.id)

			if (status === 'active') {
				activeRecipeIds.value = ids
				return
			}

			if (status === 'archived') {
				archivedRecipeIds.value = ids
			}
		}

		function removeRecipe(recipeId: string) {
			recipesById.value = omitRecordKey(recipesById.value, recipeId)
			activeRecipeIds.value = activeRecipeIds.value.filter((id) => id !== recipeId)
			archivedRecipeIds.value = archivedRecipeIds.value.filter((id) => id !== recipeId)

			const recipeItemIds = recipeItemIdsByRecipeId.value[recipeId] ?? []

			for (const recipeItemId of recipeItemIds) {
				recipeItemsById.value = omitRecordKey(recipeItemsById.value, recipeItemId)
			}

			recipeItemIdsByRecipeId.value = omitRecordKey(recipeItemIdsByRecipeId.value, recipeId)
		}

		return {
			recipesById,
			activeRecipeIds,
			archivedRecipeIds,
			recipeItemsById,
			recipeItemIdsByRecipeId,
			activeRecipeId,
			isLoading,
			isSaving,
			error,
			activeRecipes,
			archivedRecipes,
			getRecipeItems,
			setActiveRecipe,
			openRecipe,
			closeRecipe,
			fetchRecipes,
			fetchRecipe,
			startRecipesRefresh,
			stopRecipesRefresh,
			refreshRecipesNow: recipesRefresh.refreshNow,
			refreshActiveRecipeNow: activeRecipeRefresh.refreshNow,
			createRecipe,
			updateRecipe,
			archiveRecipe,
			deleteRecipe,
			addRecipeItem,
			updateRecipeItem,
			deleteRecipeItem,
			reorderRecipeItems
		}
	},
	{
		persist: {
			key: 'pantry-recipes',
			pick: [
				'recipesById',
				'activeRecipeIds',
				'archivedRecipeIds',
				'recipeItemsById',
				'recipeItemIdsByRecipeId'
			]
		}
	}
)

function mapByIds<T>(byId: EntityMap<T>, ids: string[]) {
	return ids.map((id) => byId[id]).filter((entry): entry is T => Boolean(entry))
}

function createTemporaryId(prefix: string) {
	return `tmp-${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function moveRecipeId(recipeId: string, sourceIds: string[], targetIds: string[]) {
	const sourceIndex = sourceIds.indexOf(recipeId)

	if (sourceIndex >= 0) {
		sourceIds.splice(sourceIndex, 1)
	}

	if (!targetIds.includes(recipeId)) {
		targetIds.push(recipeId)
	}
}

function omitRecordKey<T>(record: Record<string, T>, key: string) {
	const { [key]: _removed, ...rest } = record

	return rest
}
