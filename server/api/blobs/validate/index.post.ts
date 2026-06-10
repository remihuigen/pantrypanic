import { createError, defineEventHandler, getQuery, readFormData } from 'h3'

import {
	assertManagedBlob,
	blobValidationQuerySchema,
	isUploadFile,
	parseBlobQuery
} from '#server/utils/blob-storage'

/**
 * Validates multipart form files against blob upload rules without storing them.
 */
export default defineEventHandler(async (event) => {
	const query = parseBlobQuery(blobValidationQuerySchema, getQuery(event), 'Invalid blob validation query')
	const form = await readFormData(event)
	const files = form.getAll(query.formKey).filter(isUploadFile)

	if (files.length === 0) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Bad Request',
			message: `No files provided under form key "${query.formKey}".`
		})
	}

	return {
		valid: true,
		files: files.map((file) => {
			assertManagedBlob(file, event)

			return {
				name: file.name,
				size: file.size,
				contentType: file.type
			}
		})
	}
})
