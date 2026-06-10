import type { BlobSize } from '@nuxthub/core/blob'

import { blob } from '@nuxthub/blob'
import {
	assertBlobPathname,
	assertContentLength,
	assertManagedContentType,
	blobPutQuerySchema,
	createBlobPutOptions,
	parseBlobQuery
} from '#server/utils/blob-storage'
import {
	createError,
	defineEventHandler,
	getHeader,
	getQuery,
	getRequestWebStream,
	getRouterParam,
	setResponseStatus
} from 'h3'

/**
 * Writes a raw request body to an exact validated blob pathname.
 */
export default defineEventHandler(async (event) => {
	const pathname = assertBlobPathname(getRouterParam(event, 'pathname'))
	const query = parseBlobQuery(blobPutQuerySchema, getQuery(event), 'Invalid blob update query')
	const body = getRequestWebStream(event)

	if (!body) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Bad Request',
			message: 'Blob update body is required.'
		})
	}

	const contentType = assertManagedContentType(
		query.contentType ?? getHeader(event, 'content-type')
	)
	const contentLength = assertContentLength(
		getHeader(event, 'content-length'),
		useRuntimeConfig(event).pantry.managedBlobMaxUploadSize as BlobSize
	)

	const updated = await blob.put(
		pathname,
		body,
		createBlobPutOptions({
			contentType,
			contentLength,
			addRandomSuffix: false
		})
	)

	setResponseStatus(event, 200)
	return updated
})
