import { blob } from '@nuxthub/blob'
import { createError, defineEventHandler, getHeader, getRouterParam } from 'h3'

import { assertBlobPathname, assertManagedContentType } from '#server/utils/blob-storage'

const multipartActions = ['create', 'upload', 'complete', 'abort']

/**
 * Handles NuxtHub multipart blob upload actions for validated pathnames.
 */
export default defineEventHandler(async (event) => {
	const action = getRouterParam(event, 'action')

	if (!action || !multipartActions.includes(action)) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Bad Request',
			message: 'Invalid multipart blob action.'
		})
	}

	assertBlobPathname(getRouterParam(event, 'pathname'))

	const contentType = getHeader(event, 'x-nuxthub-file-content-type')

	if (contentType) {
		assertManagedContentType(contentType)
	}

	return blob.handleMultipartUpload(event)
})
