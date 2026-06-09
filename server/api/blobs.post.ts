import { blob } from '@nuxthub/blob'
import { createError, defineEventHandler, getQuery, readFormData, setResponseStatus } from 'h3'

import {
	assertBlobPathname,
	assertManagedBlob,
	assertManagedContentType,
	blobUploadQuerySchema,
	createBlobPutOptions,
	isUploadFile,
	parseBlobQuery
} from '#server/utils/blob-storage'

/**
 * Uploads one or more validated multipart form files into blob storage.
 */
export default defineEventHandler(async (event) => {
	const query = parseBlobQuery(blobUploadQuerySchema, getQuery(event), 'Invalid blob upload query')
	const form = await readFormData(event)
	const files = form.getAll(query.formKey).filter(isUploadFile)

	if (files.length === 0) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Bad Request',
			message: `No files provided under form key "${query.formKey}".`
		})
	}

	if (!query.multiple && files.length > 1) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Bad Request',
			message: 'Multiple files are not allowed for this upload.'
		})
	}

	const uploaded = []

	for (const file of files) {
		assertManagedBlob(file)
		uploaded.push(
			await blob.put(
				assertBlobPathname(file.name),
				file,
				createBlobPutOptions({
					contentType: assertManagedContentType(file.type),
					prefix: query.prefix,
					addRandomSuffix: query.addRandomSuffix
				})
			)
		)
	}

	setResponseStatus(event, 201)
	return uploaded
})
