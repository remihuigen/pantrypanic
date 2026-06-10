import { blob } from '@nuxthub/blob'
import { defineEventHandler, getRouterParam } from 'h3'

import { assertBlobPathname } from '#server/utils/blob-storage'

/**
 * Returns blob metadata for a validated pathname.
 */
export default defineEventHandler(async (event) => {
	const pathname = assertBlobPathname(getRouterParam(event, 'pathname'))

	return blob.head(pathname)
})
