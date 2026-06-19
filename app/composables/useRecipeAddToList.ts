import type { MaybeRefOrGetter } from 'vue'
import { getIcon } from '#shared/utils/icons'

import { useListsStore } from '~/stores/lists'
import { useRecipesStore } from '~/stores/recipes'
import { computed, shallowRef, toValue } from 'vue'

import { useRecipeUsage } from './useRecipeUsage'

/**
 * Shares recipe-to-list add flow across overview and detail recipe surfaces.
 *
 * @param recipeId - Reactive recipe identifier.
 * @returns Menu state, action helpers, and disabled messaging.
 */
export function useRecipeAddToList(recipeId: MaybeRefOrGetter<string | null | undefined>) {
	const listsStore = useListsStore()
	const recipesStore = useRecipesStore()
	const toast = useToast()
	const { incrementUsage } = useRecipeUsage()

	const isAddingToList = shallowRef(false)
	const resolvedRecipeId = computed(() => toValue(recipeId)?.trim() ?? '')
	const recipeItems = computed(() =>
		resolvedRecipeId.value ? recipesStore.getRecipeItems(resolvedRecipeId.value) : []
	)
	const hasRecipeItems = computed(() => recipeItems.value.length > 0)
	const hasLists = computed(() => listsStore.activeLists.length > 0)
	const canAddToList = computed(
		() => hasRecipeItems.value && hasLists.value && !isAddingToList.value
	)
	const disabledReason = computed(() => {
		if (!hasRecipeItems.value) {
			return 'Voeg eerst ingredienten toe aan dit recept.'
		}

		if (!hasLists.value) {
			return 'Maak eerst een lijst aan om dit recept toe te voegen.'
		}

		return undefined
	})
	const targetListItems = computed(() =>
		listsStore.activeLists.map((list) => ({
			label: list.name,
			icon: getIcon('listPlus'),
			disabled: isAddingToList.value,
			onSelect: async () => await addToList(list.id)
		}))
	)

	async function addToList(listId: string) {
		const currentRecipeId = resolvedRecipeId.value

		if (!currentRecipeId || !canAddToList.value) {
			return
		}

		isAddingToList.value = true

		try {
			await listsStore.addRecipeToList(currentRecipeId, listId)
			incrementUsage(currentRecipeId)
			toast.add({
				title: 'Recept toegevoegd aan lijst.',
				color: 'success',
				icon: getIcon('check')
			})
		} catch (error) {
			toast.add({
				title: getErrorMessage(error, 'Recept kon niet aan de lijst worden toegevoegd.'),
				color: 'error',
				duration: 8000,
				icon: getIcon('error')
			})
		} finally {
			isAddingToList.value = false
		}
	}

	function getErrorMessage(error: unknown, fallback: string) {
		if (error && typeof error === 'object' && 'message' in error) {
			const message = (error as { message?: unknown }).message

			if (typeof message === 'string' && message.length > 0) {
				return message
			}
		}

		if (error instanceof Error && error.message) {
			return error.message
		}

		return fallback
	}

	return {
		canAddToList,
		disabledReason,
		hasLists,
		hasRecipeItems,
		isAddingToList,
		targetListItems,
		addToList
	}
}
