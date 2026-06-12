import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

import { db } from 'hub:db'

import {
	apiSuccess,
	defineApiHandler,
	domainIdSchema,
	getAuthenticatedUserId,
	nullableAmountSchema,
	nullableTextSchema,
	optional,
	optionalAmountSchema,
	optionalTextSchema,
	orderedIdsSchema,
	parseApiInput,
	parseApiParams,
	parseApiQuery,
	throwApiError
} from '../../server/utils/api-core'
import { createSelectBuilder } from './test-db'

const getUserSession = vi.fn()

describe('api core utilities', () => {
	beforeEach(() => {
		vi.stubGlobal('getUserSession', getUserSession)
		vi.mocked(db.select).mockReset()
		getUserSession.mockReset()
	})

	afterEach(() => {
		vi.useRealTimers()
		vi.unstubAllGlobals()
	})

	it('creates success envelopes and optional response fields', () => {
		expect(apiSuccess({ ok: true })).toEqual({ success: true, data: { ok: true } })
		expect(optional(null)).toBeUndefined()
		expect(optional(undefined)).toBeUndefined()
		expect(optional('value')).toBe('value')
	})

	it('parses schema input and emits Dutch validation envelopes', () => {
		expect(parseApiInput(domainIdSchema, ' id ')).toBe('id')
		expect(parseApiInput(optionalTextSchema, undefined)).toBeUndefined()
		expect(parseApiInput(nullableTextSchema, null)).toBeNull()
		expect(parseApiInput(optionalAmountSchema, 2)).toBe(2)
		expect(parseApiInput(nullableAmountSchema, null)).toBeNull()
		expect(parseApiInput(orderedIdsSchema, { orderedIds: ['a'] })).toEqual({ orderedIds: ['a'] })

		expect(() => parseApiInput(z.strictObject({ name: z.string().min(1, 'Naam is verplicht.') }), { name: '' }))
			.toThrow('De ingevoerde gegevens zijn ongeldig.')
	})

	it('parses query and params from events', () => {
		const event = {
			path: '/api/example?limit=3',
			node: {
				req: {
					url: '/api/example?limit=3',
					headers: {
						host: 'localhost'
					}
				}
			},
			context: {
				params: {
					id: 'abc'
				}
			}
		}

		expect(parseApiQuery(event as never, z.object({ limit: z.coerce.number() }))).toEqual({ limit: 3 })
		expect(parseApiParams(event as never, z.object({ id: z.string() }), ['id'])).toEqual({ id: 'abc' })
	})

	it('returns session user ids or first-user fallback ids', async () => {
		getUserSession.mockResolvedValueOnce({ user: { id: 12 } })
		await expect(getAuthenticatedUserId({} as never)).resolves.toBe(12)

		getUserSession.mockResolvedValueOnce({})
		vi.mocked(db.select).mockReturnValueOnce(createSelectBuilder([{ id: 4 }]) as never)
		await expect(getAuthenticatedUserId({} as never)).resolves.toBe(4)
	})

	it('wraps known and unknown errors in API envelopes', async () => {
		const known = defineApiHandler(() => {
			throwApiError({
				code: 'NOT_FOUND',
				statusCode: 404,
				message: 'Niet gevonden.',
				details: { id: ['Ongeldig.'] }
			})
		})
		const knownEvent = createResponseEvent()
		await expect(known(knownEvent)).resolves.toEqual({
			success: false,
			error: { code: 'NOT_FOUND', message: 'Niet gevonden.', details: { id: ['Ongeldig.'] } }
		})
		expect(knownEvent.node.res.statusCode).toBe(404)

		const unknown = defineApiHandler(() => {
			throw new Error('boom')
		})
		const unknownEvent = createResponseEvent()
		await expect(unknown(unknownEvent)).resolves.toEqual({
			success: false,
			error: { code: 'INTERNAL_ERROR', message: 'Er is iets misgegaan.' }
		})
		expect(unknownEvent.node.res.statusCode).toBe(500)
	})

	it('maps HTTP-like errors to API error codes and default messages', async () => {
		const cases = [
			{ statusCode: 401, code: 'UNAUTHORIZED', message: 'Login vereist.' },
			{ statusCode: 403, code: 'FORBIDDEN', message: 'Geen toegang.' },
			{ statusCode: 404, code: 'NOT_FOUND', message: 'Niet gevonden.' },
			{ statusCode: 409, code: 'CONFLICT', message: 'Conflict.' },
			{ statusCode: 400, code: 'VALIDATION_ERROR', message: 'Ongeldig.' },
			{ statusCode: 418, code: 'INTERNAL_ERROR', message: '' }
		]

		for (const item of cases) {
			const handler = defineApiHandler(() => {
				throw { statusCode: item.statusCode, message: item.message }
			})
			const event = createResponseEvent()

			await expect(handler(event)).resolves.toEqual({
				success: false,
				error: {
					code: item.code,
					message: item.message || 'Er is iets misgegaan.'
				}
			})
			expect(event.node.res.statusCode).toBe(item.statusCode)
		}
	})

	it('rejects unauthenticated requests when no seed fallback user exists', async () => {
		getUserSession.mockResolvedValueOnce({})
		vi.mocked(db.select).mockReturnValueOnce(createSelectBuilder([]) as never)

		await expect(getAuthenticatedUserId({} as never)).rejects.toThrow('Je bent niet ingelogd.')
	})
})

function createResponseEvent() {
	return {
		node: {
			req: { url: '/api/test' },
			res: {
				statusCode: 200,
				statusMessage: ''
			}
		},
		context: {}
	} as never
}
