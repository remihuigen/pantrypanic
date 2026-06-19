import { useFormState } from '~/composables/useFormState'
import { describe, expect, it } from 'vitest'
import { reactive, shallowRef } from 'vue'

describe('useFormState', () => {
	it('tracks dirty state by comparing normalized form values', () => {
		const initial = shallowRef({ name: 'Milk', unit: 'liter' })
		const current = reactive({ name: ' Milk ', unit: 'liter' })
		const formState = useFormState(initial, current, {
			normalize: (value) => ({
				name: value.name.trim(),
				unit: value.unit.trim() || null
			})
		})

		expect(formState.isDirty.value).toBe(false)

		current.unit = 'pak'

		expect(formState.isDirty.value).toBe(true)

		formState.resetInitialValue()

		expect(formState.isDirty.value).toBe(false)
	})
})
