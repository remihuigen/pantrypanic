import type { ApiErrorCode, ApiErrorResponse, ApiSuccessResponse } from '#shared/types/api'
import type { H3Event } from 'h3'

import { getFirstUserIdForDomainSeed } from '#server/utils/domains/seed'
import {
	domainIdSchema,
	nullableAmountSchema,
	nullableTextSchema,
	optionalAmountSchema,
	optionalTextSchema,
	orderedIdsSchema
} from '#shared/utils/schemas/domain'
import { defineEventHandler, getQuery, getRouterParam, readBody, setResponseStatus } from 'h3'
import { z } from 'zod'

export {
	domainIdSchema,
	nullableAmountSchema,
	nullableTextSchema,
	optionalAmountSchema,
	optionalTextSchema,
	orderedIdsSchema
}

type ApiHandler<T> = (_event: H3Event) => Promise<T> | T

type ApiErrorOptions = {
	code: ApiErrorCode
	message: string
	statusCode: number
	details?: unknown
}

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
