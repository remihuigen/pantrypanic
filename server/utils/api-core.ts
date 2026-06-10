import type { H3Event } from 'h3'

import { getFirstUserIdForDomainSeed } from '#server/utils/domains/seed'
import { defineEventHandler, getQuery, getRouterParam, readBody, setResponseStatus } from 'h3'
import { z } from 'zod'

export type ApiErrorCode =
	| 'UNAUTHORIZED'
	| 'FORBIDDEN'
	| 'VALIDATION_ERROR'
	| 'NOT_FOUND'
	| 'CONFLICT'
	| 'INTERNAL_ERROR'

export type ApiSuccessResponse<T> = {
	success: true
	data: T
}

export type ApiErrorResponse = {
	success: false
	error: {
		code: ApiErrorCode
		message: string
		details?: unknown
	}
}

type ApiHandler<T> = (_event: H3Event) => Promise<T> | T

type CachedApiHandlerOptions = {
	name?: string
}

type ApiErrorOptions = {
	code: ApiErrorCode
	message: string
	statusCode: number
	details?: unknown
}

/**
 * Common schema for domain text ids.
 */
export const domainIdSchema = z
	.string({ error: 'Id is verplicht.' })
	.trim()
	.min(1, { error: 'Id is verplicht.' })
	.max(200, { error: 'Ongeldige id.' })

/**
 * Common schema for optional short text fields.
 */
export const optionalTextSchema = z
	.string({ error: 'Waarde moet tekst zijn.' })
	.trim()
	.max(500, { error: 'Waarde mag maximaal 500 tekens bevatten.' })
	.optional()

/**
 * Common schema for nullable short text fields.
 */
export const nullableTextSchema = z
	.string({ error: 'Waarde moet tekst zijn.' })
	.trim()
	.max(500, { error: 'Waarde mag maximaal 500 tekens bevatten.' })
	.nullable()
	.optional()

/**
 * Common schema for positive quantities.
 */
export const optionalAmountSchema = z
	.number({ error: 'Aantal moet een getal zijn.' })
	.positive({ error: 'Aantal moet groter zijn dan 0.' })
	.optional()

/**
 * Common schema for nullable positive quantities.
 */
export const nullableAmountSchema = z
	.number({ error: 'Aantal moet een getal zijn.' })
	.positive({ error: 'Aantal moet groter zijn dan 0.' })
	.nullable()
	.optional()

/**
 * Common schema for manually ordered id arrays.
 */
export const orderedIdsSchema = z.strictObject({
	orderedIds: z
		.array(domainIdSchema, { error: 'Volgorde is verplicht.' })
		.min(1, { error: 'Volgorde is verplicht.' })
})

/**
 * Wraps a route handler with the Pantry Panic success/error envelope.
 *
 * @param handler - Route logic that returns the response data payload.
 * @returns H3 event handler returning an API envelope.
 */
export function defineApiHandler<T>(handler: ApiHandler<T>) {
	return defineEventHandler(
		async (event): Promise<ApiSuccessResponse<Awaited<T>> | ApiErrorResponse> => {
			try {
				return apiSuccess(await handler(event))
			} catch (error) {
				const response = normalizeApiError(error)
				setResponseStatus(event, response.statusCode)
				return response.body
			}
		}
	)
}

/**
 * Wraps a route handler with the Pantry Panic API envelope and Nitro handler caching.
 *
 * Nitro derives cached handler keys from the full request URL, including query params. The wrapper
 * disables SWR so stale API data is not served after `maxAge`, and bypasses caching when the
 * runtime refresh interval is shorter than the configured cache age.
 *
 * @param handler - Route logic that returns the response data payload.
 * @param options - Optional cache handler options.
 * @returns Nitro cached event handler returning an API envelope.
 */
export function defineCachedApiHandler<T>(
	handler: ApiHandler<T>,
	options: CachedApiHandlerOptions = {}
) {
	const configuredMaxAge = getConfiguredApiCacheMaxAgeSeconds()

	return defineCachedEventHandler(
		async (event): Promise<ApiSuccessResponse<Awaited<T>> | ApiErrorResponse> => {
			try {
				return apiSuccess(await handler(event))
			} catch (error) {
				const response = normalizeApiError(error)
				setResponseStatus(event, response.statusCode)
				return response.body
			}
		},
		{
			name: options.name,
			maxAge: Math.max(configuredMaxAge, 1),
			swr: false,
			varies: ['cookie', 'x-api-token'],
			shouldBypassCache: (event) => {
				const runtimeMaxAge = getApiCacheMaxAgeSeconds(event)

				return runtimeMaxAge <= 0 || runtimeMaxAge < configuredMaxAge
			}
		}
	)
}

/**
 * Creates a success envelope.
 *
 * @param data - Endpoint response data.
 * @returns Success envelope.
 */
export function apiSuccess<T>(data: T): ApiSuccessResponse<T> {
	return {
		success: true,
		data
	}
}

/**
 * Throws a typed API error that is converted into the shared envelope.
 *
 * @param options - Error code, message, status, and optional details.
 */
export function throwApiError(options: ApiErrorOptions): never {
	throw new ApiError(options)
}

/**
 * Parses request query with a Zod schema.
 *
 * @template T - Parsed query type.
 * @param event - H3 event.
 * @param schema - Zod schema.
 * @returns Parsed query.
 */
export function parseApiQuery<T>(event: H3Event, schema: z.ZodType<T>): T {
	return parseApiInput(schema, getQuery(event))
}

/**
 * Parses request body with a Zod schema.
 *
 * @template T - Parsed body type.
 * @param event - H3 event.
 * @param schema - Zod schema.
 * @returns Parsed body.
 */
export async function parseApiBody<T>(event: H3Event, schema: z.ZodType<T>): Promise<T> {
	return parseApiInput(schema, await readBody(event))
}

/**
 * Parses route parameters with a Zod schema.
 *
 * @template T - Parsed params type.
 * @param event - H3 event.
 * @param schema - Zod schema.
 * @param keys - Param keys to read.
 * @returns Parsed params.
 */
export function parseApiParams<T>(event: H3Event, schema: z.ZodType<T>, keys: string[]): T {
	return parseApiInput(
		schema,
		Object.fromEntries(keys.map((key) => [key, getRouterParam(event, key)]))
	)
}

/**
 * Parses arbitrary input with a Zod schema and throws API validation errors.
 *
 * @template T - Parsed type.
 * @param schema - Zod schema.
 * @param input - Raw input.
 * @returns Parsed input.
 */
export function parseApiInput<T>(schema: z.ZodType<T>, input: unknown): T {
	const result = schema.safeParse(input)

	if (!result.success) {
		throwApiError({
			code: 'VALIDATION_ERROR',
			statusCode: 400,
			message: 'De ingevoerde gegevens zijn ongeldig.',
			details: z.flattenError(result.error).fieldErrors
		})
	}

	return result.data
}

/**
 * Returns the API cache maximum age in seconds.
 *
 * @param event - H3 event used to read runtime config.
 * @returns Positive max age in seconds, or zero when caching is disabled.
 */
export function getApiCacheMaxAgeSeconds(event: H3Event): number {
	const runtimeConfig = useRuntimeConfig(event)
	const refreshInterval = runtimeConfig.public?.refreshInterval
	const intervalMs =
		typeof refreshInterval === 'number' ? refreshInterval : Number(refreshInterval)

	return getApiCacheMaxAgeSecondsFromMilliseconds(intervalMs)
}

/**
 * Returns the authenticated user id for audit fields.
 *
 * @param event - H3 event.
 * @returns Authenticated or admin fallback user id.
 */
export async function getAuthenticatedUserId(event: H3Event): Promise<number> {
	const session = await getUserSession(event)
	const sessionUserId = Number(session.user?.id)

	if (Number.isInteger(sessionUserId) && sessionUserId > 0) {
		return sessionUserId
	}

	const fallbackUserId = await getFirstUserIdForDomainSeed()

	if (fallbackUserId) {
		return fallbackUserId
	}

	throwApiError({
		code: 'UNAUTHORIZED',
		statusCode: 401,
		message: 'Je bent niet ingelogd.'
	})
}

/**
 * Converts null values to undefined for optional API response fields.
 *
 * @template T - Input value type.
 * @param value - Nullable value.
 * @returns Undefined for null, otherwise the original value.
 */
export function optional<T>(value: T | null | undefined): T | undefined {
	return value ?? undefined
}

function getConfiguredApiCacheMaxAgeSeconds(): number {
	const intervalMs = Number(process.env.NUXT_PUBLIC_REFRESH_INTERVAL ?? '5000')

	return getApiCacheMaxAgeSecondsFromMilliseconds(intervalMs)
}

function getApiCacheMaxAgeSecondsFromMilliseconds(intervalMs: number): number {
	if (!Number.isFinite(intervalMs) || intervalMs < 1000) {
		return 0
	}

	return Math.floor(intervalMs / 1000)
}

class ApiError extends Error {
	code: ApiErrorCode
	statusCode: number
	details?: unknown

	constructor(options: ApiErrorOptions) {
		super(options.message)
		this.name = 'ApiError'
		this.code = options.code
		this.statusCode = options.statusCode
		this.details = options.details
	}
}

function normalizeApiError(error: unknown): { statusCode: number; body: ApiErrorResponse } {
	if (error instanceof ApiError) {
		return {
			statusCode: error.statusCode,
			body: {
				success: false,
				error: {
					code: error.code,
					message: error.message,
					...(error.details === undefined ? {} : { details: error.details })
				}
			}
		}
	}

	return {
		statusCode: 500,
		body: {
			success: false,
			error: {
				code: 'INTERNAL_ERROR',
				message: 'Er is iets misgegaan.'
			}
		}
	}
}
