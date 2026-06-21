import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { seedAdminUser } from '../../../scripts/seed-admin-user.mjs'

const originalEnv = { ...process.env }
const fetchMock = vi.fn()
let infoMock: ReturnType<typeof vi.spyOn>
let warnMock: ReturnType<typeof vi.spyOn>

describe('admin user seed script', () => {
	beforeEach(() => {
		process.env = { ...originalEnv }
		for (const key of [
			'SKIP_ADMIN_SEED',
			'ADMIN_USER_EMAIL',
			'ADMIN_USER_PASSWORD',
			'ADMIN_API_KEY',
			'NUXT_PUBLIC_SITE_URL',
			'ENABLE_MULTI_TENANCY',
			'ENABLE_PUBLIC_REGISTRATION'
		]) {
			Reflect.deleteProperty(process.env, key)
		}

		vi.stubGlobal('fetch', fetchMock)
		infoMock = vi.spyOn(console, 'info').mockImplementation(() => {})
		warnMock = vi.spyOn(console, 'warn').mockImplementation(() => {})
		fetchMock.mockReset()
	})

	afterEach(() => {
		process.env = { ...originalEnv }
		vi.unstubAllGlobals()
		infoMock.mockRestore()
		warnMock.mockRestore()
	})

	it('skips when seed is disabled', async () => {
		process.env.SKIP_ADMIN_SEED = 'true'

		await seedAdminUser()

		expect(infoMock).toHaveBeenCalledWith(
			'[seed] SKIP_ADMIN_SEED is set; skipping admin user seed.'
		)
		expect(fetchMock).not.toHaveBeenCalled()
	})

	it('skips legacy admin seed for public multi-tenant installs', async () => {
		setRequiredEnv()
		process.env.ENABLE_MULTI_TENANCY = 'true'
		process.env.ENABLE_PUBLIC_REGISTRATION = 'true'

		await seedAdminUser()

		expect(infoMock).toHaveBeenCalledWith(
			'[seed] ENABLE_MULTI_TENANCY and ENABLE_PUBLIC_REGISTRATION are enabled; skipping admin user seed.'
		)
		expect(fetchMock).not.toHaveBeenCalled()
	})

	it('skips when required environment values are missing', async () => {
		await seedAdminUser()
		expect(warnMock).toHaveBeenCalledWith(
			'[seed] ADMIN_USER_EMAIL or ADMIN_USER_PASSWORD is missing; skipping admin user seed.'
		)

		process.env.ADMIN_USER_EMAIL = 'admin@example.com'
		process.env.ADMIN_USER_PASSWORD = 'secret'
		await seedAdminUser()
		expect(warnMock).toHaveBeenCalledWith(
			'[seed] NUXT_PUBLIC_SITE_URL is missing; skipping HTTP admin user seed.'
		)

		process.env.NUXT_PUBLIC_SITE_URL = 'https://example.com'
		await seedAdminUser()
		expect(warnMock).toHaveBeenCalledWith(
			'[seed] ADMIN_API_KEY is missing; skipping HTTP admin user seed.'
		)
	})

	it('skips when the remote admin user already exists', async () => {
		setRequiredEnv()
		fetchMock.mockResolvedValueOnce(jsonResponse([{ email: 'admin@example.com' }]))

		await seedAdminUser()

		expect(fetchMock).toHaveBeenCalledTimes(1)
		expect(fetchMock.mock.calls[0]?.[0].toString()).toBe(
			'https://example.com/api/users?email=admin@example.com&limit=1'
		)
		expect(infoMock).toHaveBeenCalledWith('[seed] Admin user already exists; skipping.')
	})

	it('creates the remote admin user when missing', async () => {
		setRequiredEnv()
		fetchMock
			.mockResolvedValueOnce(jsonResponse([]))
			.mockResolvedValueOnce(textResponse('', { status: 201, statusText: 'Created' }))

		await seedAdminUser()

		expect(fetchMock).toHaveBeenCalledTimes(2)
		const requestOptions = fetchMock.mock.calls[1]?.[1] as {
			body?: unknown
			headers?: Headers
			method?: string
		}
		expect(requestOptions.method).toBe('POST')
		expect(requestOptions.headers).toBeInstanceOf(Headers)
		expect((requestOptions.headers as Headers).get('accept')).toBe('application/json')
		expect((requestOptions.headers as Headers).get('x-api-token')).toBe('admin-key')
		expect((requestOptions.headers as Headers).get('content-type')).toBe('application/json')
		expect(requestOptions.body).toBe(
			JSON.stringify({
				name: 'admin@example.com',
				email: 'admin@example.com',
				password: 'secret'
			})
		)
		expect(infoMock).toHaveBeenCalledWith('[seed] Admin user created.')
	})

	it('treats create conflicts as an already seeded user', async () => {
		setRequiredEnv()
		fetchMock
			.mockResolvedValueOnce(jsonResponse([]))
			.mockResolvedValueOnce(textResponse('exists', { status: 409, statusText: 'Conflict' }))

		await seedAdminUser()

		expect(infoMock).toHaveBeenCalledWith('[seed] Admin user already exists; skipping.')
	})

	it('logs remote request failures without throwing', async () => {
		setRequiredEnv()
		fetchMock.mockResolvedValueOnce(
			textResponse('not allowed', { status: 403, statusText: 'Forbidden' })
		)

		await seedAdminUser()

	expect(warnMock.mock.calls.at(-1)?.[0]).toContain(
			'[seed] HTTP admin user seed failed; skipping. HTTP request failed with 403 Forbidden: "not allowed"'
		)
	})
})

function setRequiredEnv() {
	process.env.ADMIN_USER_EMAIL = ' ADMIN@EXAMPLE.COM '
	process.env.ADMIN_USER_PASSWORD = 'secret'
	process.env.ADMIN_API_KEY = 'admin-key'
	process.env.NUXT_PUBLIC_SITE_URL = 'https://example.com'
}

function jsonResponse(body: unknown, init: { status?: number; statusText?: string } = {}) {
	return new Response(JSON.stringify(body), {
		status: init.status ?? 200,
		statusText: init.statusText ?? 'OK',
		headers: { 'content-type': 'application/json' }
	})
}

function textResponse(body: string, init: { status: number; statusText: string }) {
	return new Response(body, {
		status: init.status,
		statusText: init.statusText,
		headers: { 'content-type': 'text/plain' }
	})
}
