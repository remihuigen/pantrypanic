import { getIcon } from '#shared/utils/icons'
import { describe, expect, it } from 'vitest'

describe('getIcon', () => {
	it('resolves shared UI icon keys', () => {
		expect(getIcon('list')).toBe('i-lucide-list')
		expect(getIcon('settings')).toBe('i-lucide-settings')
		expect(getIcon('download')).toBe('lucide:download')
	})

	it('resolves persisted list option icons', () => {
		expect(getIcon('optionBook')).toBe('lucide:book')
		expect(getIcon('optionShoppingCart')).toBe('lucide:shopping-cart')
	})
})
