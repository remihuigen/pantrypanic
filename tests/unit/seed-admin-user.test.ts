import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { seedAdminUser } from '../../scripts/seed-admin-user.mjs'

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
			'ADMIN_API_TOKEN',
			'NUXT_PUBLIC_SITE_URL'
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

		expect(infoMock).toHaveBeenCalledWith('[seed] SKIP_ADMIN_SEED is set; skipping admin user seed.')
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
		expect(warnMock).toHaveBeenCalledWith('[seed] NUXT_PUBLIC_SITE_URL is missing; skipping HTTP admin user seed.')

		process.env.NUXT_PUBLIC_SITE_URL = 'https://example.com'
		await seedAdminUser()
		expect(warnMock).toHaveBeenCalledWith('[seed] ADMIN_API_KEY is missing; skipping HTTP admin user seed.')
	})

	it('skips when the remote admin user already exists', async () => {
		setRequiredEnv()
		fetchMock.mockResolvedValueOnce(jsonResponse([{ email: 'admin@example.com' }]))

		await seedAdminUser()

		expect(fetchMock).toHaveBeenCalledTimes(1)
		expect(fetchMock.mock.calls[0]?.[0].toString()).toBe('https://example.com/api/users?email=admin%40example.com&limit=1')
		expect(infoMock).toHaveBeenCalledWith('[seed] Admin user already exists; skipping.')
	})

	it('creates the remote admin user when missing', async () => {
		setRequiredEnv()
		fetchMock
			.mockResolvedValueOnce(jsonResponse([]))
			.mockResolvedValueOnce(textResponse('', { status: 201, statusText: 'Created' }))

		await seedAdminUser()

		expect(fetchMock).toHaveBeenCalledTimes(2)
		expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
			method: 'POST',
			headers: {
				accept: 'application/json',
				'x-api-token': 'admin-key',
				'content-type': 'application/json'
			},
			body: JSON.stringify({
				name: 'admin@example.com',
				email: 'admin@example.com',
				password: 'secret'
			})
		})
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
		fetchMock.mockResolvedValueOnce(textResponse('not allowed', { status: 403, statusText: 'Forbidden' }))

		await seedAdminUser()

		expect(warnMock.mock.calls.at(-1)?.[0]).toContain(
			'[seed] HTTP admin user seed failed; skipping. [seed] HTTP request failed with 403 Forbidden'
		)
	})

	it('uses ADMIN_API_TOKEN as a fallback key', async () => {
		setRequiredEnv()
		delete process.env.ADMIN_API_KEY
		process.env.ADMIN_API_TOKEN = 'legacy-key'
		fetchMock.mockResolvedValueOnce(jsonResponse([{ email: 'admin@example.com' }]))

		await seedAdminUser()

		expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
			headers: {
				'x-api-token': 'legacy-key'
			}
		})
	})
})

function setRequiredEnv() {
	process.env.ADMIN_USER_EMAIL = ' ADMIN@EXAMPLE.COM '
	process.env.ADMIN_USER_PASSWORD = 'secret'
	process.env.ADMIN_API_KEY = 'admin-key'
	process.env.NUXT_PUBLIC_SITE_URL = 'https://example.com'
}

function jsonResponse(body: unknown, init: { status?: number, statusText?: string } = {}) {
	return {
		ok: (init.status ?? 200) >= 200 && (init.status ?? 200) < 300,
		status: init.status ?? 200,
		statusText: init.statusText ?? 'OK',
		json: vi.fn(async () => body),
		text: vi.fn(async () => JSON.stringify(body))
	}
}

function textResponse(body: string, init: { status: number, statusText: string }) {
	return {
		ok: init.status >= 200 && init.status < 300,
		status: init.status,
		statusText: init.statusText,
		json: vi.fn(async () => JSON.parse(body)),
		text: vi.fn(async () => body)
	}
}
