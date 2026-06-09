import type { BlobEnsureOptions, BlobPutOptions, BlobSize } from '@nuxthub/core/blob'
import { ensureBlob } from '@nuxthub/blob'
import { createError } from 'h3'
import { z } from 'zod'

const MAX_PATHNAME_LENGTH = 1024

const blobSizeSchema = z.enum([
	'1B',
	'2B',
	'4B',
	'8B',
	'16B',
	'32B',
	'64B',
	'128B',
	'256B',
	'512B',
	'1024B',
	'1KB',
	'2KB',
	'4KB',
	'8KB',
	'16KB',
	'32KB',
	'64KB',
	'128KB',
	'256KB',
	'512KB',
	'1024KB',
	'1MB',
	'2MB',
	'4MB',
	'8MB',
	'16MB',
	'32MB',
	'64MB',
	'128MB',
	'256MB',
	'512MB',
	'1024MB'
])

const queryBooleanSchema = z
	.preprocess(firstQueryValue, z.enum(['true', 'false', '1', '0']).default('false'))
	.transform(value => value === 'true' || value === '1')

const optionalQueryStringSchema = z.preprocess(
	firstQueryValue,
	z
		.string()
		.trim()
		.min(1)
		.max(MAX_PATHNAME_LENGTH)
		.optional()
)

const blobPathnameSchema = z
	.string()
	.trim()
	.min(1)
	.max(MAX_PATHNAME_LENGTH)
	.refine(value => !value.startsWith('/') && !value.startsWith('\\'), {
		error: 'Pathname must be relative'
	})
	.refine(value => !value.includes('\\'), {
		error: 'Pathname cannot contain backslashes'
	})
	.refine(value => !hasControlCharacter(value), {
		error: 'Pathname cannot contain control characters'
	})
	.refine(
		value =>
			value
				.split('/')
				.every(segment => segment.length > 0 && segment !== '.' && segment !== '..'),
		{ error: 'Pathname cannot contain empty, current, or parent segments' }
	)

const blobPrefixSchema = blobPathnameSchema.optional()

export const managedBlobEnsureOptions = {
	maxSize: '32MB',
	types: [
		'image/jpeg',
		'image/png',
		'image/webp',
		'image/gif',
		'image/avif',
		'video',
		'audio',
		'pdf',
		'text',
		'application/json'
	]
} satisfies BlobEnsureOptions

export const blobListQuerySchema = z.object({
	limit: z
		.preprocess(firstQueryValue, z.coerce.number().int().min(1).max(1000).default(100)),
	prefix: optionalQueryStringSchema.pipe(blobPrefixSchema),
	cursor: optionalQueryStringSchema,
	folded: queryBooleanSchema
})

export const blobUploadQuerySchema = z.object({
	formKey: optionalQueryStringSchema.default('files'),
	multiple: queryBooleanSchema.default(true),
	prefix: optionalQueryStringSchema.pipe(blobPrefixSchema),
	addRandomSuffix: queryBooleanSchema.default(true)
})

export const blobPutQuerySchema = z.object({
	contentType: optionalQueryStringSchema
})

export const blobValidationQuerySchema = z.object({
	formKey: optionalQueryStringSchema.default('files')
})

/**
 * Validates and returns a safe relative blob pathname.
 *
 * @param value - Candidate pathname from a route parameter, query, or file name.
 * @returns A decoded, relative blob pathname that is safe for storage access.
 */
export function assertBlobPathname(value: unknown): string {
	const result = blobPathnameSchema.safeParse(decodePathnameInput(value))

	if (!result.success) {
		throw createValidationError('Invalid blob pathname', result.error)
	}

	return result.data
}

/**
 * Enforces the shared API upload rules before storage writes.
 *
 * @param file - Blob or File value submitted through the API.
 * @throws HTTP 400 when the file does not match size or type constraints.
 */
export function assertManagedBlob(file: Blob): void {
	ensureBlob(file, managedBlobEnsureOptions)
}

/**
 * Accepts only storage content types supported by the blob API.
 *
 * @param contentType - Request or file content type to validate.
 * @returns The normalized content type.
 * @throws HTTP 415 when the type is missing or unsupported.
 */
export function assertManagedContentType(contentType: string | undefined): string {
	const normalized = contentType?.split(';')[0]?.trim().toLowerCase()

	if (!normalized || !isManagedContentType(normalized)) {
		throw createError({
			statusCode: 415,
			statusMessage: 'Unsupported Media Type',
			message: 'Unsupported blob content type'
		})
	}

	return normalized
}

/**
 * Restricts the public image route to safe raster image responses.
 *
 * @param contentType - Blob metadata content type.
 * @throws HTTP 415 when the type cannot be served from the public image route.
 */
export function assertPublicImageContentType(contentType: string | undefined): void {
	const normalized = contentType?.split(';')[0]?.trim().toLowerCase()

	if (!normalized || !['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'].includes(normalized)) {
		throw createError({
			statusCode: 415,
			statusMessage: 'Unsupported Media Type',
			message: 'Only safe raster image blobs can be served from /images.'
		})
	}
}

/**
 * Requires a bounded raw upload content length.
 *
 * @param value - Raw `Content-Length` header value.
 * @param maxSize - Maximum accepted body size.
 * @returns The original content length header when valid.
 * @throws HTTP 411, 400, or 413 for missing, invalid, or oversized bodies.
 */
export function assertContentLength(value: string | undefined, maxSize: BlobSize = managedBlobEnsureOptions.maxSize): string {
	if (!value) {
		throw createError({
			statusCode: 411,
			statusMessage: 'Length Required',
			message: 'Content-Length is required for raw blob uploads.'
		})
	}

	const contentLength = Number(value)

	if (!Number.isSafeInteger(contentLength) || contentLength <= 0) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Bad Request',
			message: 'Content-Length must be a positive integer.'
		})
	}

	const maxBytes = blobSizeToBytes(maxSize)

	if (contentLength > maxBytes) {
		throw createError({
			statusCode: 413,
			statusMessage: 'Payload Too Large',
			message: `Blob uploads must be ${maxSize} or smaller.`
		})
	}

	return value
}

/**
 * Builds NuxtHub blob put options without leaking unsupported query fields.
 *
 * @param options - Validated blob write settings.
 * @returns Options accepted by NuxtHub blob storage.
 */
export function createBlobPutOptions(options: {
	contentType: string
	contentLength?: string
	prefix?: string
	addRandomSuffix?: boolean
}): BlobPutOptions {
	return {
		contentType: options.contentType,
		contentLength: options.contentLength,
		prefix: options.prefix,
		addRandomSuffix: options.addRandomSuffix
	}
}

/**
 * Narrows form entries to browser File-compatible values.
 *
 * @param value - Form data entry value to inspect.
 * @returns Whether the value behaves like a `File`.
 */
export function isUploadFile(value: unknown): value is File {
	return typeof value === 'object' && value !== null && 'size' in value && 'type' in value && 'name' in value
}

/**
 * Parses API query input and returns a standard HTTP validation error on failure.
 *
 * @template T - Parsed schema output type.
 * @param schema - Zod schema used to parse the query.
 * @param query - Raw query object from the request.
 * @param message - Error message used for failed validation.
 * @returns Parsed query data.
 */
export function parseBlobQuery<T>(schema: z.ZodType<T>, query: unknown, message: string): T {
	const result = schema.safeParse(query)

	if (!result.success) {
		throw createValidationError(message, result.error)
	}

	return result.data
}

function firstQueryValue(value: unknown): unknown {
	return Array.isArray(value) ? value[0] : value
}

function decodePathnameInput(value: unknown): unknown {
	if (typeof value !== 'string') {
		return value
	}

	try {
		return decodeURIComponent(value)
	} catch {
		throw createError({
			statusCode: 400,
			statusMessage: 'Bad Request',
			message: 'Blob pathname must be valid URI text.'
		})
	}
}

function hasControlCharacter(value: string): boolean {
	return [...value].some((character) => {
		const codePoint = character.codePointAt(0)

		return codePoint !== undefined && (codePoint < 32 || codePoint === 127)
	})
}

function isManagedContentType(value: string): boolean {
	const [family] = value.split('/')

	return (
		['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'].includes(value)
		|| family === 'video'
		|| family === 'audio'
		|| value === 'application/pdf'
		|| value === 'application/json'
		|| family === 'text'
	)
}

function createValidationError(message: string, error: z.ZodError): never {
	throw createError({
		statusCode: 400,
		statusMessage: 'Bad Request',
		message,
		data: z.flattenError(error)
	})
}

function blobSizeToBytes(input: BlobSize): number {
	const result = blobSizeSchema.safeParse(input)

	if (!result.success) {
		throw createValidationError('Invalid blob size limit', result.error)
	}

	const [, size = '0', unit = 'B'] = result.data.match(/^(\d+)(B|KB|MB|GB)$/) ?? []
	const multipliers = {
		B: 1,
		KB: 1024,
		MB: 1024 ** 2,
		GB: 1024 ** 3
	} as const
	const multiplier = multipliers[unit as keyof typeof multipliers]

	if (!multiplier) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Bad Request',
			message: 'Invalid blob size limit'
		})
	}

	return Number(size) * multiplier
}
