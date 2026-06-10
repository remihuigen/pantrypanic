import { blob } from '@nuxthub/blob'
import { defineEventHandler, getQuery } from 'h3'

import { createBlobListQuerySchema, parseBlobQuery } from '#server/utils/blob-storage'

/**
 * Lists blob metadata with optional pagination, prefix filtering, and folder folding.
 */
export default defineEventHandler(async (event) => {
	const query = parseBlobQuery(createBlobListQuerySchema(event), getQuery(event), 'Invalid blob list query')

	return blob.list(query)
})
