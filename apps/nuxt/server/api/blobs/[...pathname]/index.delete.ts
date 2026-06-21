import { blob } from '@nuxthub/blob'
import { defineEventHandler, getRouterParam, sendNoContent } from 'h3'

import { assertBlobPathname } from '#server/utils/blob-storage'

/**
 * Deletes the blob stored at a validated pathname.
 */
export default defineEventHandler(async (event) => {
	const pathname = assertBlobPathname(getRouterParam(event, 'pathname'))

	await blob.del(pathname)

	return sendNoContent(event)
})
