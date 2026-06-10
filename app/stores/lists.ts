import type { AppError } from '~~/shared/types/api'
import type {
	CanonicalItem,
	CreateListInput,
	EntityMap,
	ItemSuggestion,
	ListItem,
	ListStatus,
	OccurrenceInput,
	ShoppingList,
	UpdateListInput,
	UpdateListItemInput
} from '~~/shared/utils/schemas/domain'

import { useStoreRefresh } from '~/composables/useStoreRefresh'
import { apiFetch, normalizeAppError } from '~/utils/api-client'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { useRecipesStore } from './recipes'

type ListWithItems = ShoppingList & {
	items: ListItem[]
}

type AddedListItem = {
	id: string
	listId: string
	itemId: string
	name: string
	sourceType: ListItem['sourceType']
}

export const useListsStore = defineStore(
	'lists',
	() => {
		const listsById = ref<EntityMap<ShoppingList>>({})
		const activeListIds = ref<string[]>([])
		const archivedListIds = ref<string[]>([])
		const listItemsById = ref<EntityMap<ListItem>>({})
		const listItemIdsByListId = ref<Record<string, string[]>>({})
		const itemsById = ref<EntityMap<CanonicalItem>>({})
		const suggestionItemIds = ref<string[]>([])
		const activeListId = ref<string | null>(null)

		const isLoading = ref(false)
		const isSaving = ref(false)
		const error = ref<AppError | null>(null)

		const listCount = computed(() => activeListIds.value.length)

		const activeLists = computed(() =>
			activeListIds.value
				.map((listId) => listsById.value[listId])
				.filter((list): list is ShoppingList => Boolean(list))
		)

		const listSuggestions = computed<ItemSuggestion[]>(() =>
			suggestionItemIds.value.flatMap((itemId) => {
				const item = itemsById.value[itemId]

				if (!item) {
					return []
				}

				return [
					{
						...item,
						usageCount: 0
					}
				]
			})
		)

		const overviewRefresh = useStoreRefresh({
			immediate: false,
			refresh: async () => {
				await Promise.all([fetchLists('active'), fetchSuggestions()])
			}
		})

		const activeListRefresh = useStoreRefresh({
			enabled: computed(() => Boolean(activeListId.value)),
			immediate: false,
			refresh: async () => {
				if (!activeListId.value) {
					return
				}

				await fetchList(activeListId.value)
			}
		})

		function listById(listId: string) {
			return listsById.value[listId] ?? null
		}

		function listItemsForList(listId: string) {
			const ids = listItemIdsByListId.value[listId] ?? []

			return ids
				.map((itemId) => listItemsById.value[itemId])
				.filter((item): item is ListItem => Boolean(item))
		}

		function setStoreError(err: unknown) {
			const appError = normalizeAppError(err)

			error.value = appError

			return appError
		}

		function upsertList(list: ShoppingList) {
			listsById.value[list.id] = {
				...listsById.value[list.id],
				...list
			}
		}

		function upsertCanonicalItem(item: CanonicalItem) {
			itemsById.value[item.id] = {
				...itemsById.value[item.id],
				...item
			}
		}

		function upsertListItem(listItem: ListItem) {
			listItemsById.value[listItem.id] = {
				...listItemsById.value[listItem.id],
				...listItem
			}

			const existing = listItemIdsByListId.value[listItem.listId] ?? []

			if (!existing.includes(listItem.id)) {
				listItemIdsByListId.value[listItem.listId] = [...existing, listItem.id]
			}

			upsertCanonicalItem({
				id: listItem.itemId,
				name: listItem.name
			})
		}

		function setListItemsForList(listId: string, listItems: ListItem[]) {
			const previousIds = listItemIdsByListId.value[listId] ?? []
			const nextIds = listItems.map((item) => item.id)
			const staleIds = previousIds.filter((staleId) => !nextIds.includes(staleId))

			if (staleIds.length > 0) {
				listItemsById.value = omitRecordKeys(listItemsById.value, staleIds)
			}

			for (const listItem of listItems) {
				upsertListItem(listItem)
			}

			listItemIdsByListId.value[listId] = nextIds
		}

		function removeListItemFromState(listItemId: string) {
			const listItem = listItemsById.value[listItemId]

			if (!listItem) {
				return
			}

			const existing = listItemIdsByListId.value[listItem.listId] ?? []
			listItemIdsByListId.value[listItem.listId] = existing.filter((id) => id !== listItemId)
			listItemsById.value = omitRecordKey(listItemsById.value, listItemId)
		}

		function applyListCollection(status: ListStatus, lists: ShoppingList[]) {
			for (const list of lists) {
				upsertList(list)
			}

			const orderedIds = [...lists]
				.sort((left, right) => left.position - right.position)
				.map((list) => list.id)

			if (status === 'active') {
				activeListIds.value = orderedIds
				return
			}

			if (status === 'archived') {
				archivedListIds.value = orderedIds
			}
		}

		function ensureListOrderMatchesIds(listIds: string[]) {
			for (const [index, listId] of listIds.entries()) {
				const list = listsById.value[listId]

				if (!list) {
					continue
				}

				listsById.value[listId] = {
					...list,
					position: index
				}
			}
		}

		async function fetchLists(status: ListStatus = 'active') {
			isLoading.value = true
			error.value = null

			try {
				const query = new URLSearchParams({ status })
				const data = await apiFetch<{ lists: ShoppingList[] }>(
					`/api/lists?${query.toString()}`
				)

				applyListCollection(status, data.lists)

				return data.lists
			} catch (err) {
				throw setStoreError(err)
			} finally {
				isLoading.value = false
			}
		}

		async function createList(input: CreateListInput) {
			isSaving.value = true
			error.value = null

			try {
				const data = await apiFetch<{ list: ShoppingList }>('/api/lists', {
					method: 'POST',
					body: input
				})

				upsertList(data.list)

				if (data.list.status === 'active') {
					activeListIds.value = [...activeListIds.value, data.list.id]
					ensureListOrderMatchesIds(activeListIds.value)
				}

				return data.list
			} catch (err) {
				throw setStoreError(err)
			} finally {
				isSaving.value = false
			}
		}

		async function fetchList(listId: string) {
			isLoading.value = true
			error.value = null

			try {
				const data = await apiFetch<{ list: ListWithItems }>(`/api/lists/${listId}`)
				const { items, ...list } = data.list

				upsertList(list)
				setListItemsForList(list.id, items)

				return data.list
			} catch (err) {
				throw setStoreError(err)
			} finally {
				isLoading.value = false
			}
		}

		async function updateList(listId: string, input: UpdateListInput) {
			isSaving.value = true
			error.value = null

			try {
				const data = await apiFetch<{ list: ShoppingList }>(`/api/lists/${listId}`, {
					method: 'PATCH',
					body: input
				})

				upsertList(data.list)

				return data.list
			} catch (err) {
				throw setStoreError(err)
			} finally {
				isSaving.value = false
			}
		}

		async function archiveList(listId: string) {
			error.value = null

			const previous = listsById.value[listId]

			if (previous) {
				listsById.value[listId] = {
					...previous,
					status: 'archived'
				}
				activeListIds.value = activeListIds.value.filter((id) => id !== listId)
				archivedListIds.value = [...archivedListIds.value, listId]
			}

			try {
				const data = await apiFetch<{
					list: Pick<ShoppingList, 'id' | 'status' | 'archivedAt'>
				}>(`/api/lists/${listId}/archive`, { method: 'POST' })

				const existing = listsById.value[listId]

				if (existing) {
					listsById.value[listId] = {
						...existing,
						status: data.list.status,
						archivedAt: data.list.archivedAt
					}
				}

				return data.list
			} catch (err) {
				if (previous) {
					listsById.value[listId] = previous
					activeListIds.value = [...activeListIds.value, listId].sort(
						(leftId, rightId) => {
							const left = listsById.value[leftId]
							const right = listsById.value[rightId]

							return (left?.position ?? 0) - (right?.position ?? 0)
						}
					)
					archivedListIds.value = archivedListIds.value.filter((id) => id !== listId)
				}

				throw setStoreError(err)
			}
		}

		async function deleteList(listId: string) {
			error.value = null

			const previous = listsById.value[listId]
			const previousItemIds = [...(listItemIdsByListId.value[listId] ?? [])]
			const previousItems = previousItemIds
				.map((id) => listItemsById.value[id])
				.filter((item): item is ListItem => Boolean(item))

			activeListIds.value = activeListIds.value.filter((id) => id !== listId)
			archivedListIds.value = archivedListIds.value.filter((id) => id !== listId)
			listsById.value = omitRecordKey(listsById.value, listId)

			listItemsById.value = omitRecordKeys(listItemsById.value, previousItemIds)
			listItemIdsByListId.value = omitRecordKey(listItemIdsByListId.value, listId)

			try {
				const data = await apiFetch<{
					list: Pick<ShoppingList, 'id' | 'status' | 'deletedAt'>
				}>(`/api/lists/${listId}/delete`, { method: 'POST' })

				return data.list
			} catch (err) {
				if (previous) {
					listsById.value[listId] = previous
				}

				if (previous?.status === 'active') {
					activeListIds.value = [...activeListIds.value, listId].sort(
						(leftId, rightId) => {
							const left = listsById.value[leftId]
							const right = listsById.value[rightId]

							return (left?.position ?? 0) - (right?.position ?? 0)
						}
					)
				}

				if (previous?.status === 'archived') {
					archivedListIds.value = [...archivedListIds.value, listId]
				}

				for (const listItem of previousItems) {
					upsertListItem(listItem)
				}

				listItemIdsByListId.value[listId] = previousItemIds

				throw setStoreError(err)
			}
		}

		async function reorderLists(orderedIds: string[]) {
			error.value = null

			const previousIds = [...activeListIds.value]
			const previousLists = Object.fromEntries(
				previousIds.map((id) => [id, listsById.value[id]])
			)

			activeListIds.value = [...orderedIds]
			ensureListOrderMatchesIds(activeListIds.value)

			try {
				const data = await apiFetch<{ lists: Array<{ id: string; position: number }> }>(
					'/api/lists/reorder',
					{
						method: 'POST',
						body: {
							orderedIds
						}
					}
				)

				for (const updated of data.lists) {
					const current = listsById.value[updated.id]

					if (!current) {
						continue
					}

					listsById.value[updated.id] = {
						...current,
						position: updated.position
					}
				}

				return data.lists
			} catch (err) {
				activeListIds.value = previousIds

				for (const [id, list] of Object.entries(previousLists)) {
					if (list) {
						listsById.value[id] = list
					}
				}

				throw setStoreError(err)
			}
		}

		async function addListItem(listId: string, input: OccurrenceInput) {
			error.value = null

			const tempListItemId = createTempId('list-item')
			const tempItemId = createTempId('item')
			const existingIds = listItemIdsByListId.value[listId] ?? []
			const optimisticItem: ListItem = {
				id: tempListItemId,
				listId,
				itemId: tempItemId,
				name: input.name,
				amount: input.amount,
				unit: input.unit,
				note: input.note,
				status: 'unchecked',
				position: existingIds.length,
				sourceType: 'manual'
			}

			upsertCanonicalItem({ id: tempItemId, name: input.name })
			upsertListItem(optimisticItem)

			try {
				const data = await apiFetch<{ listItem: ListItem }>(`/api/lists/${listId}/items`, {
					method: 'POST',
					body: input
				})

				removeListItemFromState(tempListItemId)
				itemsById.value = omitRecordKey(itemsById.value, tempItemId)
				upsertListItem(data.listItem)

				return data.listItem
			} catch (err) {
				removeListItemFromState(tempListItemId)
				itemsById.value = omitRecordKey(itemsById.value, tempItemId)

				throw setStoreError(err)
			}
		}

		async function updateListItem(listItemId: string, input: UpdateListItemInput) {
			error.value = null

			try {
				const data = await apiFetch<{ listItem: ListItem }>(
					`/api/list-items/${listItemId}`,
					{
						method: 'PATCH',
						body: input
					}
				)

				const existing = listItemsById.value[listItemId]

				if (existing && existing.listId !== data.listItem.listId) {
					const previousIds = listItemIdsByListId.value[existing.listId] ?? []
					listItemIdsByListId.value[existing.listId] = previousIds.filter(
						(id) => id !== listItemId
					)
				}

				upsertListItem(data.listItem)

				return data.listItem
			} catch (err) {
				throw setStoreError(err)
			}
		}

		async function checkListItem(listItemId: string) {
			error.value = null

			const existing = listItemsById.value[listItemId]

			if (!existing) {
				throw setStoreError({
					code: 'NOT_FOUND',
					message: 'Niet gevonden.'
				})
			}

			const snapshot = { ...existing }
			listItemsById.value[listItemId] = {
				...existing,
				status: 'checked',
				checkedAt: Date.now()
			}

			try {
				const data = await apiFetch<{
					listItem: Pick<ListItem, 'id' | 'status' | 'checkedAt'>
				}>(`/api/list-items/${listItemId}/check`, {
					method: 'POST'
				})

				listItemsById.value[listItemId] = {
					...listItemsById.value[listItemId],
					...data.listItem
				}

				return data.listItem
			} catch (err) {
				listItemsById.value[listItemId] = snapshot

				throw setStoreError(err)
			}
		}

		async function uncheckListItem(listItemId: string) {
			error.value = null

			const existing = listItemsById.value[listItemId]

			if (!existing) {
				throw setStoreError({
					code: 'NOT_FOUND',
					message: 'Niet gevonden.'
				})
			}

			const snapshot = { ...existing }
			listItemsById.value[listItemId] = {
				...existing,
				status: 'unchecked',
				checkedAt: undefined
			}

			try {
				const data = await apiFetch<{
					listItem: Pick<ListItem, 'id' | 'status'>
				}>(`/api/list-items/${listItemId}/uncheck`, {
					method: 'POST'
				})

				listItemsById.value[listItemId] = {
					...listItemsById.value[listItemId],
					...data.listItem
				}

				return data.listItem
			} catch (err) {
				listItemsById.value[listItemId] = snapshot

				throw setStoreError(err)
			}
		}

		async function deleteListItem(listItemId: string) {
			error.value = null

			const existing = listItemsById.value[listItemId]

			if (!existing) {
				throw setStoreError({
					code: 'NOT_FOUND',
					message: 'Niet gevonden.'
				})
			}

			const listId = existing.listId
			const previousIds = [...(listItemIdsByListId.value[listId] ?? [])]
			const previousSnapshot = { ...existing }

			removeListItemFromState(listItemId)

			try {
				const data = await apiFetch<{
					listItem: Pick<ListItem, 'id' | 'status' | 'deletedAt'>
				}>(`/api/list-items/${listItemId}/delete`, {
					method: 'POST'
				})

				return data.listItem
			} catch (err) {
				listItemsById.value[listItemId] = previousSnapshot
				listItemIdsByListId.value[listId] = previousIds

				throw setStoreError(err)
			}
		}

		async function reorderListItems(listId: string, orderedIds: string[]) {
			error.value = null

			const previousIds = [...(listItemIdsByListId.value[listId] ?? [])]
			const previousItems = Object.fromEntries(
				previousIds.map((itemId) => [itemId, listItemsById.value[itemId]])
			)

			listItemIdsByListId.value[listId] = [...orderedIds]

			for (const [position, itemId] of orderedIds.entries()) {
				const listItem = listItemsById.value[itemId]

				if (!listItem) {
					continue
				}

				listItemsById.value[itemId] = {
					...listItem,
					position
				}
			}

			try {
				const data = await apiFetch<{ items: Array<{ id: string; position: number }> }>(
					`/api/lists/${listId}/items/reorder`,
					{
						method: 'POST',
						body: {
							orderedIds
						}
					}
				)

				for (const updated of data.items) {
					const current = listItemsById.value[updated.id]

					if (!current) {
						continue
					}

					listItemsById.value[updated.id] = {
						...current,
						position: updated.position
					}
				}

				return data.items
			} catch (err) {
				listItemIdsByListId.value[listId] = previousIds

				for (const [itemId, snapshot] of Object.entries(previousItems)) {
					if (snapshot) {
						listItemsById.value[itemId] = snapshot
					}
				}

				throw setStoreError(err)
			}
		}

		async function clearList(listId: string) {
			error.value = null

			const previousIds = [...(listItemIdsByListId.value[listId] ?? [])]
			const previousItems = previousIds
				.map((id) => listItemsById.value[id])
				.filter((item): item is ListItem => Boolean(item))

			listItemsById.value = omitRecordKeys(listItemsById.value, previousIds)

			listItemIdsByListId.value[listId] = []

			try {
				const data = await apiFetch<{ archivedCount: number }>(
					`/api/lists/${listId}/clear`,
					{
						method: 'POST'
					}
				)

				return data
			} catch (err) {
				for (const listItem of previousItems) {
					listItemsById.value[listItem.id] = listItem
				}
				listItemIdsByListId.value[listId] = previousIds

				throw setStoreError(err)
			}
		}

		async function addRecipeToList(recipeId: string, listId: string) {
			error.value = null

			const recipesStore = useRecipesStore()
			const knownRecipeItems = recipesStore.getRecipeItems(recipeId)
			const optimisticIds: string[] = []

			for (const recipeItem of knownRecipeItems) {
				const tempId = createTempId('list-item')
				const position = (listItemIdsByListId.value[listId] ?? []).length
				const optimisticListItem: ListItem = {
					id: tempId,
					listId,
					itemId: recipeItem.itemId,
					name: recipeItem.name,
					amount: recipeItem.amount,
					unit: recipeItem.unit,
					note: recipeItem.note,
					status: 'unchecked',
					position,
					sourceType: 'recipe'
				}

				upsertListItem(optimisticListItem)
				optimisticIds.push(tempId)
			}

			try {
				const data = await apiFetch<{ addedItems: AddedListItem[] }>(
					`/api/recipes/${recipeId}/add-to-list`,
					{
						method: 'POST',
						body: { listId }
					}
				)

				for (const optimisticId of optimisticIds) {
					removeListItemFromState(optimisticId)
				}

				for (const [index, addedItem] of data.addedItems.entries()) {
					const position = (listItemIdsByListId.value[listId] ?? []).length + index
					upsertListItem({
						id: addedItem.id,
						listId: addedItem.listId,
						itemId: addedItem.itemId,
						name: addedItem.name,
						status: 'unchecked',
						position,
						sourceType: addedItem.sourceType
					})
				}

				await fetchList(listId)

				return data.addedItems
			} catch (err) {
				for (const optimisticId of optimisticIds) {
					removeListItemFromState(optimisticId)
				}

				await fetchList(listId).catch(() => undefined)

				throw setStoreError(err)
			}
		}

		async function fetchSuggestions(listId?: string, limit?: number) {
			error.value = null

			try {
				const query = new URLSearchParams()

				if (typeof limit === 'number') {
					query.set('limit', String(limit))
				}

				if (listId) {
					query.set('listId', listId)
				}

				const endpoint =
					query.size > 0
						? `/api/items/suggestions?${query.toString()}`
						: '/api/items/suggestions'
				const data = await apiFetch<{ items: ItemSuggestion[] }>(endpoint)

				for (const suggestion of data.items) {
					upsertCanonicalItem(suggestion)
				}

				suggestionItemIds.value = data.items.map((item) => item.id)

				return data.items
			} catch (err) {
				throw setStoreError(err)
			}
		}

		async function searchItems(query: string, limit?: number) {
			error.value = null

			try {
				const params = new URLSearchParams({ q: query })

				if (typeof limit === 'number') {
					params.set('limit', String(limit))
				}

				const data = await apiFetch<{ items: CanonicalItem[] }>(
					`/api/items/search?${params.toString()}`
				)

				for (const item of data.items) {
					upsertCanonicalItem(item)
				}

				return data.items
			} catch (err) {
				throw setStoreError(err)
			}
		}

		async function openList(listId: string) {
			activeListId.value = listId
			await fetchList(listId)
			await activeListRefresh.start()
		}

		function closeList() {
			activeListId.value = null
			activeListRefresh.stop()
		}

		async function startOverviewRefresh() {
			await overviewRefresh.start()
		}

		function stopOverviewRefresh() {
			overviewRefresh.stop()
		}

		return {
			listsById,
			activeListIds,
			archivedListIds,
			listItemsById,
			listItemIdsByListId,
			itemsById,
			suggestionItemIds,
			activeListId,
			isLoading,
			isSaving,
			error,
			activeLists,
			listSuggestions,
			listCount,
			listById,
			listItemsForList,
			fetchLists,
			createList,
			fetchList,
			updateList,
			archiveList,
			deleteList,
			reorderLists,
			addListItem,
			updateListItem,
			checkListItem,
			uncheckListItem,
			deleteListItem,
			reorderListItems,
			clearList,
			addRecipeToList,
			fetchSuggestions,
			searchItems,
			openList,
			closeList,
			startOverviewRefresh,
			stopOverviewRefresh,
			refreshOverviewNow: overviewRefresh.refreshNow,
			refreshActiveListNow: activeListRefresh.refreshNow
		}
	},
	{
		persist: {
			key: 'pantry-lists',
			pick: [
				'listsById',
				'activeListIds',
				'archivedListIds',
				'listItemsById',
				'listItemIdsByListId',
				'itemsById',
				'suggestionItemIds',
				'activeListId'
			]
		}
	}
)

function createTempId(prefix: string) {
	return `${prefix}:temp:${Date.now()}:${Math.random().toString(16).slice(2)}`
}

function omitRecordKey<T>(record: Record<string, T>, key: string) {
	const { [key]: _removed, ...rest } = record

	return rest
}

function omitRecordKeys<T>(record: Record<string, T>, keys: string[]) {
	let next = record

	for (const key of keys) {
		next = omitRecordKey(next, key)
	}

	return next
}
