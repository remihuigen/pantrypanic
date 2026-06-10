import { apiFetch, normalizeAppError } from '~/utils/api-client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('api-client', () => {
	const fetchMock = vi.fn()

	beforeEach(() => {
		vi.resetAllMocks()
		;(globalThis as unknown as { $fetch: typeof fetchMock }).$fetch = fetchMock
	})

	afterEach(() => {
		delete (globalThis as { $fetch?: unknown }).$fetch
	})

	it('unwraps successful API envelope responses', async () => {
		fetchMock.mockResolvedValue({
			success: true,
			data: {
				list: {
					id: 'list-1'
				}
			}
		})

		const response = await apiFetch<{ list: { id: string } }>('/api/lists/list-1')

		expect(response.list.id).toBe('list-1')
		expect(fetchMock).toHaveBeenCalledWith('/api/lists/list-1', undefined)
	})

	it('throws normalized app errors from failed envelope responses', async () => {
		fetchMock.mockRejectedValue({
			data: {
				success: false,
				error: {
					code: 'VALIDATION_ERROR',
					message: 'De ingevoerde gegevens zijn ongeldig.',
					details: {
						name: ['Naam is verplicht.']
					}
				}
			}
		})

		await expect(apiFetch('/api/lists')).rejects.toEqual({
			code: 'VALIDATION_ERROR',
			message: 'De ingevoerde gegevens zijn ongeldig.',
			details: {
				name: ['Naam is verplicht.']
			}
		})
	})

	it('normalizes plain errors into INTERNAL_ERROR', () => {
		const error = normalizeAppError(new Error('Kapot'))

		expect(error.code).toBe('INTERNAL_ERROR')
		expect(error.message).toBe('Kapot')
	})
})
