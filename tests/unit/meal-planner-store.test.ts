import * as refreshComposable from '~/composables/useStoreRefresh'
import { useMealPlannerStore } from '~/stores/meal-planner'
import * as apiClient from '~/utils/api-client'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

function mockRefreshComposable() {
	vi.spyOn(refreshComposable, 'useStoreRefresh').mockReturnValue({
		isRunning: false,
		isRefreshing: false,
		start: vi.fn(async () => undefined),
		stop: vi.fn(),
		refreshNow: vi.fn(async () => undefined)
	} as never)
}

describe('useMealPlannerStore', () => {
	beforeEach(() => {
		setActivePinia(createPinia())
		vi.restoreAllMocks()
		mockRefreshComposable()
		vi.spyOn(apiClient, 'normalizeAppError').mockImplementation((error) => error as never)
	})

	it('updates a day optimistically and rolls back on failure', async () => {
		const store = useMealPlannerStore()
		store.mealPlannerDayIds = ['day-1']
		store.mealPlannerDaysById['day-1'] = {
			id: 'day-1',
			dayOfWeek: 1,
			type: 'placeholder',
			placeholderName: 'Oud',
			items: undefined
		}

		vi.spyOn(apiClient, 'apiFetch').mockRejectedValueOnce({
			code: 'CONFLICT',
			message: 'Kon dag niet opslaan.'
		})

		await expect(
			store.updateMealPlannerDay(1, {
				type: 'empty'
			})
		).rejects.toEqual({
			code: 'CONFLICT',
			message: 'Kon dag niet opslaan.'
		})

		expect(store.mealPlannerDaysById['day-1']?.type).toBe('placeholder')
		expect(store.mealPlannerDaysById['day-1']?.placeholderName).toBe('Oud')
	})
})
