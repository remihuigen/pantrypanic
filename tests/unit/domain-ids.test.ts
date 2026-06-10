import { describe, expect, it } from 'vitest'

import { createDomainId } from '../../server/utils/api-helpers'

describe('domain ids', () => {
	it('creates UUID v7 ids', () => {
		const id = createDomainId()

		expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u)
	})

	it('creates unique ids across calls', () => {
		const ids = new Set(Array.from({ length: 100 }, () => createDomainId()))

		expect(ids.size).toBe(100)
	})
})
