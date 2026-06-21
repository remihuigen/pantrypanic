import { formatDate } from '~/../layer/marketing/app/utils/date'
import { afterEach, describe, expect, it, vi } from 'vitest'

describe('layer/marketing/app/utils/date.ts', () => {
	afterEach(() => {
		vi.restoreAllMocks()
	})

	it('formats dates with the provided locale and expected options', () => {
		const toLocaleDateString = vi
			.spyOn(Date.prototype, 'toLocaleDateString')
			.mockReturnValue('19 jun 2026')

		const result = formatDate('2026-06-19', 'nl-NL')

		expect(result).toBe('19 jun 2026')
		expect(toLocaleDateString).toHaveBeenCalledWith('nl-NL', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		})
	})

	it('defaults to en-US when no locale is provided', () => {
		const toLocaleDateString = vi
			.spyOn(Date.prototype, 'toLocaleDateString')
			.mockReturnValue('Jun 19, 2026')

		const result = formatDate('2026-06-19')

		expect(result).toBe('Jun 19, 2026')
		expect(toLocaleDateString).toHaveBeenCalledWith('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		})
	})
})
