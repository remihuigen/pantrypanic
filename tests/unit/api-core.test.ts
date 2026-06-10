import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

import { db } from 'hub:db'

import {
	apiSuccess,
	defineCachedApiHandler,
	defineApiHandler,
	domainIdSchema,
	getApiCacheMaxAgeSeconds,
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
const useRuntimeConfig = vi.fn()
const defineCachedEventHandler = vi.fn((handler: unknown, _options: unknown) => handler)

describe('api core utilities', () => {
	beforeEach(() => {
		vi.stubGlobal('getUserSession', getUserSession)
		vi.stubGlobal('useRuntimeConfig', useRuntimeConfig)
		vi.stubGlobal('defineCachedEventHandler', defineCachedEventHandler)
		delete process.env.NUXT_PUBLIC_REFRESH_INTERVAL
		vi.mocked(db.select).mockReset()
		getUserSession.mockReset()
		useRuntimeConfig.mockReset()
		defineCachedEventHandler.mockClear()
		useRuntimeConfig.mockReturnValue({ public: { refreshInterval: 5000 } })
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

	it('reads cache max age from the refresh interval', () => {
		expect(getApiCacheMaxAgeSeconds({} as never)).toBe(5)
		useRuntimeConfig.mockReturnValue({ public: { refreshInterval: '1500' } })
		expect(getApiCacheMaxAgeSeconds({} as never)).toBe(1)

		useRuntimeConfig.mockReturnValue({ public: { refreshInterval: 999 } })
		expect(getApiCacheMaxAgeSeconds({} as never)).toBe(0)

		useRuntimeConfig.mockReturnValue({ public: { refreshInterval: 'nope' } })
		expect(getApiCacheMaxAgeSeconds({} as never)).toBe(0)
	})

	it('wraps successful cached handlers with Nitro cache options', async () => {
		const handler = defineCachedApiHandler(() => ({ lists: [] }), { name: 'lists-index' })
		const options = defineCachedEventHandler.mock.calls[0]?.[1] as {
			name: string
			maxAge: number
			swr: boolean
			varies: string[]
			shouldBypassCache: (_event: never) => boolean
		}

		await expect(handler(createResponseEvent())).resolves.toEqual({
			success: true,
			data: { lists: [] }
		})
		expect(options).toMatchObject({
			name: 'lists-index',
			maxAge: 5,
			swr: false,
			varies: ['cookie', 'x-api-token']
		})
		expect(options.shouldBypassCache({} as never)).toBe(false)
	})

	it('bypasses Nitro cache when runtime refresh interval is shorter than configured max age', () => {
		defineCachedApiHandler(() => ({ ok: true }), { name: 'short-interval' })
		const options = defineCachedEventHandler.mock.calls[0]?.[1] as {
			shouldBypassCache: (_event: never) => boolean
		}

		useRuntimeConfig.mockReturnValue({ public: { refreshInterval: 2000 } })
		expect(options.shouldBypassCache({} as never)).toBe(true)

		useRuntimeConfig.mockReturnValue({ public: { refreshInterval: 0 } })
		expect(options.shouldBypassCache({} as never)).toBe(true)
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
			throwApiError({ code: 'NOT_FOUND', statusCode: 404, message: 'Niet gevonden.' })
		})
		const knownEvent = createResponseEvent()
		await expect(known(knownEvent)).resolves.toEqual({
			success: false,
			error: { code: 'NOT_FOUND', message: 'Niet gevonden.' }
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
