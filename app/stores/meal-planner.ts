import type { AppError } from '~~/shared/types/api'
import type {
	EntityMap,
	MealPlannerDay,
	MealPlannerDayInput,
	MealPlannerDayItem,
	UpdateOccurrenceInput
} from '~~/shared/utils/schemas/domain'

import { useStoreRefresh } from '~/composables/useStoreRefresh'
import { apiFetch, normalizeAppError } from '~/utils/api-client'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { useListsStore } from './lists'

type AddedListItem = {
	id: string
	listId: string
	itemId: string
	name: string
	sourceType: 'meal_planner_recipe' | 'meal_planner_placeholder'
}

export const useMealPlannerStore = defineStore(
	'meal-planner',
	() => {
		const mealPlannerDaysById = ref<EntityMap<MealPlannerDay>>({})
		const mealPlannerDayIds = ref<string[]>([])
		const mealPlannerDayItemIdsByDayId = ref<Record<string, string[]>>({})
		const mealPlannerDayItemsById = ref<EntityMap<MealPlannerDayItem>>({})
		const isLoading = ref(false)
		const isSaving = ref(false)
		const error = ref<AppError | null>(null)

		const orderedDays = computed(() =>
			mealPlannerDayIds.value
				.map((dayId) => mealPlannerDaysById.value[dayId])
				.filter((day): day is MealPlannerDay => Boolean(day))
		)

		const plannerRefresh = useStoreRefresh({
			immediate: false,
			refresh: async () => {
				await fetchMealPlanner()
			}
		})

		function setStoreError(err: unknown) {
			const appError = normalizeAppError(err)
			error.value = appError
			return appError
		}

		function dayItems(dayId: string) {
			const ids = mealPlannerDayItemIdsByDayId.value[dayId] ?? []

			return ids
				.map((itemId) => mealPlannerDayItemsById.value[itemId])
				.filter((item): item is MealPlannerDayItem => Boolean(item))
		}

		function resolveDayId(dayOfWeek: number) {
			const day = orderedDays.value.find((entry) => entry.dayOfWeek === dayOfWeek)

			if (!day) {
				throw setStoreError({ code: 'NOT_FOUND', message: 'Niet gevonden.' })
			}

			return day.id
		}

		function upsertDay(day: MealPlannerDay) {
			mealPlannerDaysById.value[day.id] = {
				...mealPlannerDaysById.value[day.id],
				...day
			}
		}

		function upsertDayItem(dayId: string, item: MealPlannerDayItem) {
			mealPlannerDayItemsById.value[item.id] = item

			const ids = mealPlannerDayItemIdsByDayId.value[dayId] ?? []

			if (!ids.includes(item.id)) {
				mealPlannerDayItemIdsByDayId.value[dayId] = [...ids, item.id]
			}
		}

		function setMealPlannerDays(days: MealPlannerDay[]) {
			const ordered = [...days].sort((left, right) => left.dayOfWeek - right.dayOfWeek)
			const knownDayIds = new Set(ordered.map((day) => day.id))
			const staleDayIds = Object.keys(mealPlannerDaysById.value).filter(
				(staleDayId) => !knownDayIds.has(staleDayId)
			)

			if (staleDayIds.length > 0) {
				mealPlannerDaysById.value = omitRecordKeys(mealPlannerDaysById.value, staleDayIds)
				mealPlannerDayItemIdsByDayId.value = omitRecordKeys(
					mealPlannerDayItemIdsByDayId.value,
					staleDayIds
				)
			}

			mealPlannerDayIds.value = ordered.map((day) => day.id)

			for (const day of ordered) {
				const dayItemIds = day.items?.map((item) => item.id) ?? []
				const previousIds = mealPlannerDayItemIdsByDayId.value[day.id] ?? []
				const staleIds = previousIds.filter((staleId) => !dayItemIds.includes(staleId))

				if (staleIds.length > 0) {
					mealPlannerDayItemsById.value = omitRecordKeys(
						mealPlannerDayItemsById.value,
						staleIds
					)
				}

				upsertDay({
					...day,
					items: undefined
				})

				mealPlannerDayItemIdsByDayId.value[day.id] = dayItemIds

				for (const item of day.items ?? []) {
					mealPlannerDayItemsById.value[item.id] = item
				}
			}
		}

		async function fetchMealPlanner() {
			isLoading.value = true
			error.value = null

			try {
				const data = await apiFetch<{ days: MealPlannerDay[] }>('/api/meal-planner')
				setMealPlannerDays(data.days)
				return data.days
			} catch (err) {
				throw setStoreError(err)
			} finally {
				isLoading.value = false
			}
		}

		async function updateMealPlannerDay(dayOfWeek: number, input: MealPlannerDayInput) {
			isSaving.value = true
			error.value = null

			const dayId = resolveDayId(dayOfWeek)
			const existingDay = mealPlannerDaysById.value[dayId]

			if (!existingDay) {
				throw setStoreError({ code: 'NOT_FOUND', message: 'Niet gevonden.' })
			}

			const previousDay: MealPlannerDay = { ...existingDay }
			const previousItems = dayItems(dayId)

			if (input.type === 'empty') {
				mealPlannerDaysById.value[dayId] = {
					...existingDay,
					type: 'empty',
					recipe: undefined,
					recipeId: undefined,
					placeholderName: undefined,
					placeholderNotes: undefined
				}
				mealPlannerDayItemIdsByDayId.value[dayId] = []
			}

			if (input.type === 'recipe') {
				mealPlannerDaysById.value[dayId] = {
					...existingDay,
					type: 'recipe',
					recipe: undefined,
					recipeId: input.recipeId,
					placeholderName: undefined,
					placeholderNotes: undefined
				}
				mealPlannerDayItemIdsByDayId.value[dayId] = []
			}

			if (input.type === 'placeholder') {
				mealPlannerDaysById.value[dayId] = {
					...existingDay,
					type: 'placeholder',
					recipe: undefined,
					recipeId: undefined,
					placeholderName: input.placeholderName,
					placeholderNotes: input.placeholderNotes ?? undefined
				}
			}

			try {
				const data = await apiFetch<{
					day: Pick<
						MealPlannerDay,
						'id' | 'dayOfWeek' | 'type' | 'recipeId' | 'placeholderName'
					>
				}>(`/api/meal-planner/days/${dayOfWeek}`, {
					method: 'PATCH',
					body: input
				})

				const currentDay = mealPlannerDaysById.value[dayId] ?? previousDay

				mealPlannerDaysById.value[dayId] = {
					...currentDay,
					...data.day
				}

				return data.day
			} catch (err) {
				mealPlannerDaysById.value[dayId] = previousDay
				mealPlannerDayItemIdsByDayId.value[dayId] = previousItems.map((item) => item.id)

				for (const item of previousItems) {
					mealPlannerDayItemsById.value[item.id] = item
				}

				throw setStoreError(err)
			} finally {
				isSaving.value = false
			}
		}

		async function addDayItem(
			dayOfWeek: number,
			input: { name: string; label?: string; amount?: number; unit?: string; note?: string }
		) {
			error.value = null

			const dayId = resolveDayId(dayOfWeek)
			const tempItemId = createTempId('meal-day-item')
			const nextPosition = (mealPlannerDayItemIdsByDayId.value[dayId] ?? []).length

			upsertDayItem(dayId, {
				id: tempItemId,
				itemId: createTempId('item'),
				name: input.name,
				label: input.label,
				amount: input.amount,
				unit: input.unit,
				note: input.note,
				position: nextPosition
			})

			try {
				const data = await apiFetch<{ mealPlannerDayItem: MealPlannerDayItem }>(
					`/api/meal-planner/days/${dayOfWeek}/items`,
					{
						method: 'POST',
						body: input
					}
				)

				removeDayItem(dayId, tempItemId)
				upsertDayItem(dayId, data.mealPlannerDayItem)

				return data.mealPlannerDayItem
			} catch (err) {
				removeDayItem(dayId, tempItemId)
				throw setStoreError(err)
			}
		}

		async function updateDayItem(mealPlannerDayItemId: string, input: UpdateOccurrenceInput) {
			error.value = null

			const existing = mealPlannerDayItemsById.value[mealPlannerDayItemId]

			if (!existing) {
				throw setStoreError({ code: 'NOT_FOUND', message: 'Niet gevonden.' })
			}

			const snapshot = { ...existing }
			mealPlannerDayItemsById.value[mealPlannerDayItemId] = {
				...existing,
				...(input.label === undefined ? {} : { label: input.label ?? undefined }),
				...(input.amount === undefined ? {} : { amount: input.amount ?? undefined }),
				...(input.unit === undefined ? {} : { unit: input.unit ?? undefined }),
				...(input.note === undefined ? {} : { note: input.note ?? undefined })
			}

			try {
				const data = await apiFetch<{
					mealPlannerDayItem: { id: string; updatedAt: number }
				}>(`/api/meal-planner/day-items/${mealPlannerDayItemId}`, {
					method: 'PATCH',
					body: input
				})

				mealPlannerDayItemsById.value[mealPlannerDayItemId] = {
					...mealPlannerDayItemsById.value[mealPlannerDayItemId],
					updatedAt: data.mealPlannerDayItem.updatedAt
				}

				return data.mealPlannerDayItem
			} catch (err) {
				mealPlannerDayItemsById.value[mealPlannerDayItemId] = snapshot
				throw setStoreError(err)
			}
		}

		async function deleteDayItem(mealPlannerDayItemId: string) {
			error.value = null

			const dayId = Object.keys(mealPlannerDayItemIdsByDayId.value).find((id) =>
				(mealPlannerDayItemIdsByDayId.value[id] ?? []).includes(mealPlannerDayItemId)
			)

			if (!dayId) {
				throw setStoreError({ code: 'NOT_FOUND', message: 'Niet gevonden.' })
			}

			const existing = mealPlannerDayItemsById.value[mealPlannerDayItemId]
			const previousIds = [...(mealPlannerDayItemIdsByDayId.value[dayId] ?? [])]

			removeDayItem(dayId, mealPlannerDayItemId)

			try {
				await apiFetch<{ ok: true }>(
					`/api/meal-planner/day-items/${mealPlannerDayItemId}/delete`,
					{
						method: 'POST'
					}
				)
			} catch (err) {
				if (existing) {
					mealPlannerDayItemsById.value[existing.id] = existing
				}
				mealPlannerDayItemIdsByDayId.value[dayId] = previousIds
				throw setStoreError(err)
			}
		}

		async function reorderDayItems(dayOfWeek: number, orderedIds: string[]) {
			error.value = null

			const dayId = resolveDayId(dayOfWeek)
			const previousIds = [...(mealPlannerDayItemIdsByDayId.value[dayId] ?? [])]
			const previousItems = Object.fromEntries(
				previousIds.map((id) => [id, mealPlannerDayItemsById.value[id]])
			)

			mealPlannerDayItemIdsByDayId.value[dayId] = [...orderedIds]

			for (const [position, itemId] of orderedIds.entries()) {
				const existing = mealPlannerDayItemsById.value[itemId]

				if (existing) {
					mealPlannerDayItemsById.value[itemId] = {
						...existing,
						position
					}
				}
			}

			try {
				const data = await apiFetch<{ items: Array<{ id: string; position: number }> }>(
					`/api/meal-planner/days/${dayOfWeek}/items/reorder`,
					{
						method: 'POST',
						body: {
							orderedIds
						}
					}
				)

				for (const item of data.items) {
					const existing = mealPlannerDayItemsById.value[item.id]

					if (existing) {
						mealPlannerDayItemsById.value[item.id] = {
							...existing,
							position: item.position
						}
					}
				}

				return data.items
			} catch (err) {
				mealPlannerDayItemIdsByDayId.value[dayId] = previousIds

				for (const [itemId, snapshot] of Object.entries(previousItems)) {
					if (snapshot) {
						mealPlannerDayItemsById.value[itemId] = snapshot
					}
				}

				throw setStoreError(err)
			}
		}

		async function addMealPlannerToList(listId: string) {
			error.value = null

			const listsStore = useListsStore()
			const optimisticIds: string[] = []
			const placeholderDays = orderedDays.value.filter((day) => day.type === 'placeholder')

			for (const day of placeholderDays) {
				for (const item of dayItems(day.id)) {
					const tempId = createTempId('list-item')
					const position = (listsStore.listItemIdsByListId[listId] ?? []).length
					listsStore.listItemsById[tempId] = {
						id: tempId,
						listId,
						itemId: item.itemId,
						name: item.name,
						label: item.label,
						amount: item.amount,
						unit: item.unit,
						note: item.note,
						status: 'unchecked',
						position,
						sourceType: 'meal_planner_placeholder'
					}
					listsStore.listItemIdsByListId[listId] = [
						...(listsStore.listItemIdsByListId[listId] ?? []),
						tempId
					]
					optimisticIds.push(tempId)
				}
			}

			try {
				const data = await apiFetch<{ addedItems: AddedListItem[] }>(
					'/api/meal-planner/add-to-list',
					{
						method: 'POST',
						body: { listId }
					}
				)

				for (const optimisticId of optimisticIds) {
					listsStore.listItemsById = omitRecordKey(listsStore.listItemsById, optimisticId)
					listsStore.listItemIdsByListId[listId] = (
						listsStore.listItemIdsByListId[listId] ?? []
					).filter((id) => id !== optimisticId)
				}

				await listsStore.fetchList(listId)

				return data.addedItems
			} catch (err) {
				for (const optimisticId of optimisticIds) {
					listsStore.listItemsById = omitRecordKey(listsStore.listItemsById, optimisticId)
					listsStore.listItemIdsByListId[listId] = (
						listsStore.listItemIdsByListId[listId] ?? []
					).filter((id) => id !== optimisticId)
				}

				await listsStore.fetchList(listId).catch(() => undefined)

				throw setStoreError(err)
			}
		}

		async function clearMealPlanner() {
			error.value = null

			const previousDays = JSON.parse(
				JSON.stringify(mealPlannerDaysById.value)
			) as EntityMap<MealPlannerDay>
			const previousDayIds = [...mealPlannerDayIds.value]
			const previousDayItemIds = JSON.parse(
				JSON.stringify(mealPlannerDayItemIdsByDayId.value)
			) as Record<string, string[]>
			const previousItems = JSON.parse(
				JSON.stringify(mealPlannerDayItemsById.value)
			) as EntityMap<MealPlannerDayItem>

			for (const dayId of mealPlannerDayIds.value) {
				const currentDay = mealPlannerDaysById.value[dayId]

				if (!currentDay) {
					continue
				}

				mealPlannerDaysById.value[dayId] = {
					...currentDay,
					type: 'empty',
					recipe: undefined,
					recipeId: undefined,
					placeholderName: undefined,
					placeholderNotes: undefined
				}
				mealPlannerDayItemIdsByDayId.value[dayId] = []
			}

			mealPlannerDayItemsById.value = {}

			try {
				const data = await apiFetch<{ clearedDays: number }>('/api/meal-planner/clear', {
					method: 'POST'
				})

				return data
			} catch (err) {
				mealPlannerDaysById.value = previousDays
				mealPlannerDayIds.value = previousDayIds
				mealPlannerDayItemIdsByDayId.value = previousDayItemIds
				mealPlannerDayItemsById.value = previousItems

				throw setStoreError(err)
			}
		}

		async function startRefresh() {
			await plannerRefresh.start()
		}

		function stopRefresh() {
			plannerRefresh.stop()
		}

		function removeDayItem(dayId: string, dayItemId: string) {
			mealPlannerDayItemsById.value = omitRecordKey(mealPlannerDayItemsById.value, dayItemId)
			mealPlannerDayItemIdsByDayId.value[dayId] = (
				mealPlannerDayItemIdsByDayId.value[dayId] ?? []
			).filter((id) => id !== dayItemId)
		}

		return {
			mealPlannerDaysById,
			mealPlannerDayIds,
			mealPlannerDayItemIdsByDayId,
			mealPlannerDayItemsById,
			isLoading,
			isSaving,
			error,
			orderedDays,
			dayItems,
			fetchMealPlanner,
			updateMealPlannerDay,
			addDayItem,
			updateDayItem,
			deleteDayItem,
			reorderDayItems,
			addMealPlannerToList,
			clearMealPlanner,
			startRefresh,
			stopRefresh,
			refreshNow: plannerRefresh.refreshNow
		}
	},
	{
		persist: {
			key: 'pantry-meal-planner',
			pick: [
				'mealPlannerDaysById',
				'mealPlannerDayIds',
				'mealPlannerDayItemIdsByDayId',
				'mealPlannerDayItemsById'
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
