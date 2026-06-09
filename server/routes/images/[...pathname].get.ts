import { blob } from '@nuxthub/blob'
import { createError, defineEventHandler, getRouterParam, setHeader } from 'h3'

import { assertBlobPathname, assertPublicImageContentType } from '#server/utils/blob-storage'

/**
 * Serves safe raster image blobs from validated pathnames.
 */
export default defineEventHandler(async (event) => {
	const pathname = getRouterParam(event, 'pathname')

	if (!pathname) {
		throw createError({
			statusCode: 404,
			statusMessage: 'Not Found'
		})
	}

	const safePathname = assertBlobPathname(pathname)
	const metadata = await blob.head(safePathname)

	assertPublicImageContentType(metadata.contentType)
	setHeader(event, 'Content-Security-Policy', 'default-src \'none\';')

	return blob.serve(event, safePathname)
})
