import { pathToFileURL } from 'node:url'

import dotenv from 'dotenv'
import { FetchError, ofetch } from 'ofetch'

dotenv.config()

const ADMIN_API_KEY_HEADER = 'x-api-token'

/**
 * Seeds the initial admin user through the configured HTTP instance when missing.
 *
 * @returns {Promise<void>} Nothing; logs whether the seed created, skipped, or could not run.
 */
export async function seedAdminUser() {
	const email = process.env.ADMIN_USER_EMAIL?.trim().toLowerCase()
	const password = process.env.ADMIN_USER_PASSWORD
	const siteUrl = process.env.NUXT_PUBLIC_SITE_URL
	const adminApiKey = process.env.ADMIN_API_KEY

	if (isSeedDisabled()) {
		console.info('[seed] SKIP_ADMIN_SEED is set; skipping admin user seed.')
		return
	}

	if (isPublicMultiTenantInstall()) {
		console.info(
			'[seed] ENABLE_MULTI_TENANCY and ENABLE_PUBLIC_REGISTRATION are enabled; skipping admin user seed.'
		)
		return
	}

	if (!email || !password) {
		console.warn(
			'[seed] ADMIN_USER_EMAIL or ADMIN_USER_PASSWORD is missing; skipping admin user seed.'
		)
		return
	}

	if (!siteUrl) {
		console.warn('[seed] NUXT_PUBLIC_SITE_URL is missing; skipping HTTP admin user seed.')
		return
	}

	if (!adminApiKey) {
		console.warn('[seed] ADMIN_API_KEY is missing; skipping HTTP admin user seed.')
		return
	}

	const user = {
		name: email,
		email,
		password
	}

	try {
		if (await remoteUserExists(siteUrl, adminApiKey, user.email)) {
			console.info('[seed] Admin user already exists; skipping.')
			return
		}

		await createRemoteUser(siteUrl, adminApiKey, user)
		console.info('[seed] Admin user created.')
	} catch (error) {
		console.warn(`[seed] HTTP admin user seed failed; skipping. ${formatSeedError(error)}`)
	}
}

/**
 * Checks whether a remote user already exists.
 *
 * @param {string} siteUrl - Base site URL.
 * @param {string} adminApiKey - Admin API key used for seeding.
 * @param {string} email - User email address to check.
 * @returns {Promise<boolean>} Whether the user exists.
 */
async function remoteUserExists(siteUrl, adminApiKey, email) {
	const users = await ofetch(createApiUrl(siteUrl, 'api/users').toString(), {
		headers: createSeedHeaders(adminApiKey),
		query: {
			email,
			limit: '1'
		}
	})

	return users.some((user) => user.email === email)
}

/**
 * Creates the remote admin user.
 *
 * @param {string} siteUrl - Base site URL.
 * @param {string} adminApiKey - Admin API key used for seeding.
 * @param {{ name: string, email: string, password: string }} user - User payload.
 * @returns {Promise<void>} Nothing.
 */
async function createRemoteUser(siteUrl, adminApiKey, user) {
	try {
		await ofetch(createApiUrl(siteUrl, 'api/users').toString(), {
			method: 'POST',
			headers: createSeedHeaders(adminApiKey),
			body: user
		})
	} catch (error) {
		if (error instanceof FetchError && error.response?.status === 409) {
			console.info('[seed] Admin user already exists; skipping.')
			return
		}

		throw error
	}
}

/**
 * Creates an API URL from the configured site URL.
 *
 * @param {string} siteUrl - Base site URL.
 * @param {string} path - API path.
 * @returns {URL} Fully qualified API URL.
 */
function createApiUrl(siteUrl, path) {
	const baseUrl = siteUrl.endsWith('/') ? siteUrl : `${siteUrl}/`

	return new URL(path, baseUrl)
}

/**
 * Creates the headers required for admin seed requests.
 *
 * @param {string} adminApiKey - Admin API key.
 * @returns {Record<string, string>} Request headers.
 */
function createSeedHeaders(adminApiKey) {
	return {
		accept: 'application/json',
		[ADMIN_API_KEY_HEADER]: adminApiKey
	}
}

/**
 * Formats unknown seed errors for logging.
 *
 * @param {unknown} error - Unknown thrown error.
 * @returns {string} Human-readable error message.
 */
function formatSeedError(error) {
	if (error instanceof FetchError) {
		const status = error.response?.status
		const statusText = error.response?.statusText
		const data = error.data ? JSON.stringify(error.data).slice(0, 300) : error.message

		return `HTTP request failed${status ? ` with ${status}` : ''}${
			statusText ? ` ${statusText}` : ''
		}: ${data}`
	}

	if (error instanceof Error) {
		return error.message
	}

	return String(error)
}

/**
 * Checks whether admin seeding has been disabled.
 *
 * @returns {boolean} Whether seeding is disabled.
 */
function isSeedDisabled() {
	return ['1', 'true'].includes(process.env.SKIP_ADMIN_SEED?.toLowerCase() ?? '')
}

/**
 * Checks whether this is a public multi-tenant install.
 *
 * @returns {boolean} Whether public multi-tenancy is enabled.
 */
function isPublicMultiTenantInstall() {
	return (
		process.env.ENABLE_MULTI_TENANCY === 'true' &&
		process.env.ENABLE_PUBLIC_REGISTRATION === 'true'
	)
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
	await seedAdminUser()
}
