import { useRecipeUsage } from '~/composables/useRecipeUsage'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, shallowRef } from 'vue'

type RecipeUsageCountsByUser = Record<string, Record<string, number>>

describe('useRecipeUsage', () => {
	beforeEach(() => {
		vi.stubGlobal('computed', computed)
	})

	afterEach(() => {
		vi.unstubAllGlobals()
	})

	it('tracks recipe usage counts per user in local storage', () => {
		const profile = shallowRef<{ id: number } | null>({ id: 1 })
		const storage = shallowRef<RecipeUsageCountsByUser>({
			1: { 'recipe-known': 2 },
			anonymous: { 'recipe-public': 1 }
		})
		vi.stubGlobal('useSettingsStore', () => ({
			get profile() {
				return profile.value
			}
		}))
		vi.stubGlobal('useLocalStorage', vi.fn(() => storage))

		const usage = useRecipeUsage()

		expect(usage.getUsageCount('recipe-known')).toBe(2)
		expect(usage.getUsageCount('missing')).toBe(0)

		usage.incrementUsage('recipe-known')
		usage.incrementUsage('recipe-new')

		expect(storage.value[1]).toEqual({
			'recipe-known': 3,
			'recipe-new': 1
		})

		profile.value = null

		expect(usage.getUsageCount('recipe-public')).toBe(1)

		usage.incrementUsage('recipe-public')

		expect(storage.value.anonymous).toEqual({ 'recipe-public': 2 })
	})
})
