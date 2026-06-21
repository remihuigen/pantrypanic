import { ensureBlob } from '@nuxthub/blob'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

import {
	assertBlobPathname,
	assertContentLength,
	assertManagedBlob,
	assertManagedContentType,
	assertPublicImageContentType,
	blobUploadQuerySchema,
	createBlobListQuerySchema,
	createBlobPutOptions,
	createManagedBlobEnsureOptions,
	isUploadFile,
	parseBlobQuery
} from '#server/utils/blob-storage'

vi.mock('@nuxthub/blob', () => ({
	ensureBlob: vi.fn()
}))

describe('blob storage utilities', () => {
	beforeEach(() => {
		vi.mocked(ensureBlob).mockReset()
		vi.stubGlobal('useRuntimeConfig', () => ({
			pantry: {
				defaultBlobListLimit: 100,
				maxBlobListLimit: 1000,
				managedBlobMaxUploadSize: '32MB'
			}
		}))
	})

	afterEach(() => {
		vi.unstubAllGlobals()
	})

	it('accepts safe relative blob pathnames and decodes URI text', () => {
		expect(assertBlobPathname('images/photo.jpg')).toBe('images/photo.jpg')
		expect(assertBlobPathname('folder%20name/file.png')).toBe('folder name/file.png')
	})

	it.each([
		'',
		'/absolute.jpg',
		'\\absolute.jpg',
		'a//b.jpg',
		'a/../b.jpg',
		'a/./b.jpg',
		'a\\b.jpg',
		'a\u0000b.jpg'
	])('rejects unsafe pathname %s', (value) => {
		expectHttpError(() => assertBlobPathname(value), {
			statusCode: 400,
			message: 'Invalid blob pathname'
		})
	})

	it('rejects malformed URI pathnames', () => {
		expectHttpError(() => assertBlobPathname('%'), {
			statusCode: 400,
			message: 'Blob pathname must be valid URI text.'
		})
	})

	it('delegates managed blob validation to NuxtHub ensureBlob', () => {
		const file = new Blob(['hello'], { type: 'text/plain' })

		assertManagedBlob(file)

		expect(ensureBlob).toHaveBeenCalledWith(file, createManagedBlobEnsureOptions())
	})

	it('reads blob query and upload limits from runtime config', () => {
		vi.stubGlobal('useRuntimeConfig', () => ({
			pantry: {
				defaultBlobListLimit: 15,
				maxBlobListLimit: 25,
				managedBlobMaxUploadSize: '64MB'
			}
		}))

		expect(parseBlobQuery(createBlobListQuerySchema(), {}, 'bad query')).toMatchObject({
			limit: 15
		})
		expect(() =>
			parseBlobQuery(createBlobListQuerySchema(), { limit: '26' }, 'bad query')
		).toThrow()
		expect(createManagedBlobEnsureOptions()).toMatchObject({ maxSize: '64MB' })
	})

	it.each([
		['Image/PNG; charset=utf-8', 'image/png'],
		['video/mp4', 'video/mp4'],
		['audio/mpeg', 'audio/mpeg'],
		['application/pdf', 'application/pdf'],
		['text/csv', 'text/csv'],
		['application/json', 'application/json']
	])('normalizes supported content type %s', (input, expected) => {
		expect(assertManagedContentType(input)).toBe(expected)
	})

	it.each([undefined, '', 'application/x-msdownload', 'image/svg+xml'])(
		'rejects unsupported managed content type %s',
		(value) => {
			expectHttpError(() => assertManagedContentType(value), {
				statusCode: 415,
				message: 'Unsupported blob content type'
			})
		}
	)

	it.each(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif; charset=utf-8'])(
		'allows safe raster public image content type %s',
		(value) => {
			expect(() => assertPublicImageContentType(value)).not.toThrow()
		}
	)

	it.each([undefined, 'image/svg+xml', 'text/html'])(
		'rejects unsafe public image content type %s',
		(value) => {
			expectHttpError(() => assertPublicImageContentType(value), {
				statusCode: 415,
				message: 'Only safe raster image blobs can be served from /images.'
			})
		}
	)

	it('validates content length boundaries', () => {
		expect(assertContentLength('1024', '1KB')).toBe('1024')
		expectHttpError(() => assertContentLength(undefined), { statusCode: 411 })
		expectHttpError(() => assertContentLength('0'), { statusCode: 400 })
		expectHttpError(() => assertContentLength('1.5'), { statusCode: 400 })
		expectHttpError(() => assertContentLength('1025', '1KB'), { statusCode: 413 })
		expectHttpError(() => assertContentLength('1', '3MB' as never), {
			statusCode: 400,
			message: 'Invalid blob size limit'
		})
	})

	it('creates blob put options from validated values', () => {
		expect(
			createBlobPutOptions({
				contentType: 'image/png',
				contentLength: '42',
				prefix: 'images',
				addRandomSuffix: false
			})
		).toEqual({
			contentType: 'image/png',
			contentLength: '42',
			prefix: 'images',
			addRandomSuffix: false
		})
	})

	it('detects upload file shaped values', () => {
		expect(isUploadFile({ size: 1, type: 'text/plain', name: 'a.txt' })).toBe(true)
		expect(isUploadFile(new Blob(['a']))).toBe(false)
		expect(isUploadFile(null)).toBe(false)
	})

	it('parses blob list and upload queries', () => {
		expect(
			parseBlobQuery(
				createBlobListQuerySchema(),
				{
					limit: ['25'],
					prefix: 'images',
					cursor: 'next',
					folded: '1'
				},
				'bad query'
			)
		).toEqual({
			limit: 25,
			prefix: 'images',
			cursor: 'next',
			folded: true
		})

		expect(
			parseBlobQuery(
				blobUploadQuerySchema,
				{
					formKey: 'asset',
					multiple: 'false',
					prefix: 'uploads',
					addRandomSuffix: '0'
				},
				'bad upload query'
			)
		).toEqual({
			formKey: 'asset',
			multiple: false,
			prefix: 'uploads',
			addRandomSuffix: false
		})
	})

	it('throws HTTP validation errors for invalid query values', () => {
		expectHttpError(
			() =>
				parseBlobQuery(
					z.object({ pathname: z.string().min(2) }),
					{ pathname: 'a' },
					'Invalid query'
				),
			{
				statusCode: 400,
				message: 'Invalid query'
			}
		)
	})
})

function expectHttpError(fn: () => unknown, expected: { statusCode: number; message?: string }) {
	try {
		fn()
		throw new Error('Expected function to throw.')
	} catch (error) {
		expect(error).toMatchObject(expected)
	}
}
