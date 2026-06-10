import { pathToFileURL } from 'node:url'

import dotenv from 'dotenv'

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

async function remoteUserExists(siteUrl, adminApiKey, email) {
	const url = createApiUrl(siteUrl, 'api/users')
	url.searchParams.set('email', email)
	url.searchParams.set('limit', '1')

	const users = await requestJson(url, {
		headers: createSeedHeaders(adminApiKey)
	})

	return users.some((user) => user.email === email)
}

async function createRemoteUser(siteUrl, adminApiKey, user) {
	const response = await fetch(createApiUrl(siteUrl, 'api/users'), {
		method: 'POST',
		headers: {
			...createSeedHeaders(adminApiKey),
			'content-type': 'application/json'
		},
		body: JSON.stringify(user)
	})

	if (response.status === 409) {
		console.info('[seed] Admin user already exists; skipping.')
		return
	}

	await assertOkResponse(response)
}

async function requestJson(url, init) {
	const response = await fetch(url, init)

	await assertOkResponse(response)

	return response.json()
}

async function assertOkResponse(response) {
	if (response.ok) {
		return
	}

	const message = await response.text()

	throw new Error(
		`[seed] HTTP request failed with ${response.status} ${response.statusText}: ${message.slice(0, 300)}`
	)
}

function createApiUrl(siteUrl, path) {
	const baseUrl = siteUrl.endsWith('/') ? siteUrl : `${siteUrl}/`

	return new URL(path, baseUrl)
}

function createSeedHeaders(adminApiKey) {
	return {
		accept: 'application/json',
		[ADMIN_API_KEY_HEADER]: adminApiKey
	}
}

function formatSeedError(error) {
	if (error instanceof Error) {
		return error.message
	}

	return String(error)
}

function isSeedDisabled() {
	return ['1', 'true'].includes(process.env.SKIP_ADMIN_SEED?.toLowerCase() ?? '')
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
	await seedAdminUser()
}
