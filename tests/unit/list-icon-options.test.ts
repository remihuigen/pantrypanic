import { icons as lucideIconSet } from '@iconify-json/lucide'
import { LIST_ICON_OPTIONS } from '~/utils/listIconOptions'
import { describe, expect, it } from 'vitest'

describe('LIST_ICON_OPTIONS', () => {
	it('contains 25 unique Dutch-labelled Lucide Iconify icons', () => {
		expect(LIST_ICON_OPTIONS).toHaveLength(25)

		const labels = new Set<string>()
		const values = new Set<string>()

		for (const option of LIST_ICON_OPTIONS) {
			labels.add(option.label)
			values.add(option.value)

			expect(option.label).toMatch(/\p{Letter}/u)
			expect(option.value).toBe(option.icon)
			expect(option.value.startsWith('lucide:')).toBe(true)
		}

		expect(labels.size).toBe(25)
		expect(values.size).toBe(25)
	})

	it('only references icons that exist in the installed Iconify Lucide source', () => {
		for (const option of LIST_ICON_OPTIONS) {
			const iconName = option.value.replace('lucide:', '')

			expect(lucideIconSet.icons[iconName], option.value).toBeDefined()
		}
	})
})
