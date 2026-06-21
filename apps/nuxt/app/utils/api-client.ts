import type { ApiEnvelope, ApiErrorResponse, AppError } from '~~/shared/types/api'

type FetchOptions = Parameters<typeof $fetch>[1]

type ErrorWithData = {
	data?: unknown
	statusCode?: number
	statusMessage?: string
	message?: string
}

/**
 * Converts unknown values into the shared frontend error shape.
 *
 * @param error - Unknown thrown value.
 * @returns Normalized app error.
 */
export function normalizeAppError(error: unknown): AppError {
	if (isAppError(error)) {
		return error
	}

	if (isObject(error)) {
		const fromErrorEnvelope = extractErrorFromEnvelope((error as ErrorWithData).data)

		if (fromErrorEnvelope) {
			return fromErrorEnvelope
		}

		const nestedEnvelope = extractErrorFromEnvelope((error as { error?: unknown }).error)

		if (nestedEnvelope) {
			return nestedEnvelope
		}
	}

	if (error instanceof Error) {
		return {
			code: 'INTERNAL_ERROR',
			message: error.message || 'Er is iets misgegaan.'
		}
	}

	return {
		code: 'INTERNAL_ERROR',
		message: 'Er is iets misgegaan.'
	}
}

/**
 * Fetches a backend API endpoint and unwraps the success/error envelope.
 *
 * @template T - Successful payload shape.
 * @param request - Request path.
 * @param options - Optional ofetch options.
 * @returns Unwrapped data payload.
 */
export async function apiFetch<T>(request: string, options?: FetchOptions): Promise<T> {
	try {
		const response = await $fetch<ApiEnvelope<T>>(request, options)

		if (response.success) {
			return response.data
		}

		throw response.error
	} catch (error) {
		throw normalizeAppError(error)
	}
}

function extractErrorFromEnvelope(value: unknown): AppError | null {
	if (!isApiErrorEnvelope(value)) {
		return null
	}

	return {
		code: value.error.code,
		message: value.error.message,
		details: value.error.details
	}
}

function isApiErrorEnvelope(value: unknown): value is ApiErrorResponse {
	if (!isObject(value) || value.success !== false) {
		return false
	}

	const possibleError = (value as { error?: unknown }).error

	if (!isObject(possibleError)) {
		return false
	}

	return typeof possibleError.code === 'string' && typeof possibleError.message === 'string'
}

function isAppError(value: unknown): value is AppError {
	if (!isObject(value)) {
		return false
	}

	return typeof value.code === 'string' && typeof value.message === 'string'
}

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null
}
