import { mkdir, readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { scaffoldInfrastructure } from '../scaffold.js'

const testDirectories: string[] = []

afterEach(async () => {
	await Promise.all(
		testDirectories
			.splice(0)
			.map(async (directory) => await rm(directory, { recursive: true, force: true }))
	)
})

describe('scaffoldInfrastructure', () => {
	it('creates missing resources once and writes a secret-free environment file', async () => {
		const projectRoot = await createProjectRoot('creates')
		const cloudflare = createCloudflareMock()

		const result = await scaffoldInfrastructure({
			environment: 'staging',
			projectRoot,
			fetchImplementation: cloudflare.fetch,
			env: credentials
		})

		expect(result.created).toEqual([
			'D1 database pantrypanic-staging',
			'R2 bucket pantrypanic-staging'
		])
		expect(result.environmentFile).toMatchObject({
			CLOUDFLARE_D1_DATABASE_ID: 'database-staging',
			CLOUDFLARE_R2_BUCKET: 'pantrypanic-staging',
			CLOUDFLARE_WORKER_NAME: 'pantrypanic-staging'
		})

		const output = await readFile(join(projectRoot, 'infra', '.staging.env'), 'utf8')

		expect(output).toContain('CLOUDFLARE_D1_DATABASE_ID=database-staging')
		expect(output).not.toContain(credentials.CLOUDFLARE_API_TOKEN)
		expect(cloudflare.createCalls).toEqual(['d1', 'r2'])
		expect(
			cloudflare.requests.find(
				(request) => request.path.endsWith('/d1/database') && request.method === 'POST'
			)?.body
		).toBe(JSON.stringify({ name: 'pantrypanic-staging' }))
		expect(
			cloudflare.requests.find(
				(request) => request.path.endsWith('/r2/buckets') && request.method === 'POST'
			)?.headers
		).not.toHaveProperty('cf-r2-jurisdiction')

		const repeat = await scaffoldInfrastructure({
			environment: 'staging',
			projectRoot,
			fetchImplementation: cloudflare.fetch,
			env: credentials
		})

		expect(repeat.created).toEqual([])
		expect(cloudflare.createCalls).toEqual(['d1', 'r2'])
	})

	it('applies a jurisdiction only when it is explicitly requested', async () => {
		const projectRoot = await createProjectRoot('jurisdiction')
		const cloudflare = createCloudflareMock()

		await scaffoldInfrastructure({
			environment: 'staging',
			jurisdiction: 'eu',
			projectRoot,
			fetchImplementation: cloudflare.fetch,
			env: credentials
		})

		expect(
			cloudflare.requests.find(
				(request) => request.path.endsWith('/d1/database') && request.method === 'POST'
			)?.body
		).toBe(JSON.stringify({ name: 'pantrypanic-staging', jurisdiction: 'eu' }))
		expect(
			cloudflare.requests.find(
				(request) => request.path.endsWith('/r2/buckets') && request.method === 'POST'
			)?.headers
		).toMatchObject({
			'cf-r2-jurisdiction': 'eu'
		})
	})

	it('reports missing resources in dry-run mode without creating resources or writing a file', async () => {
		const projectRoot = await createProjectRoot('dry-run')
		const cloudflare = createCloudflareMock()

		const result = await scaffoldInfrastructure({
			environment: 'production',
			dryRun: true,
			projectRoot,
			fetchImplementation: cloudflare.fetch,
			env: credentials,
			log: vi.fn()
		})

		expect(result).toEqual({
			created: [],
			wouldCreate: ['D1 database pantrypanic', 'R2 bucket pantrypanic'],
			dryRun: true
		})
		expect(cloudflare.createCalls).toEqual([])
		await expect(
			readFile(join(projectRoot, 'infra', '.production.env'), 'utf8')
		).rejects.toMatchObject({
			code: 'ENOENT'
		})
	})
})

const credentials = {
	CLOUDFLARE_ACCOUNT_ID: 'account-id',
	CLOUDFLARE_API_TOKEN: 'cloudflare-token'
}

async function createProjectRoot(name: string) {
	const projectRoot = join(process.cwd(), `.test-${name}-${crypto.randomUUID()}`)

	await mkdir(join(projectRoot, 'infra'), { recursive: true })
	testDirectories.push(projectRoot)
	return projectRoot
}

function createCloudflareMock() {
	const databases = new Map<string, { name: string; uuid: string; jurisdiction: 'eu' }>()
	const buckets = new Map<string, { name: string; jurisdiction: 'eu' }>()
	const createCalls: string[] = []
	const requests: Array<{
		path: string
		method: string
		body: string | undefined
		headers: Record<string, string>
	}> = []

	const fetch = vi.fn(
		async (input: string | URL | Request, init?: Parameters<typeof globalThis.fetch>[1]) => {
			const url = new URL(String(input))
			const method = init?.method ?? 'GET'
			const path = url.pathname
			requests.push({
				path,
				method,
				body: init?.body ? String(init.body) : undefined,
				headers: Object.fromEntries(Object.entries(init?.headers ?? {}))
			})

			if (path.endsWith('/d1/database') && method === 'GET') {
				return jsonResponse({ result: [...databases.values()] })
			}

			if (path.endsWith('/d1/database') && method === 'POST') {
				const { name } = JSON.parse(String(init?.body)) as { name: string }
				const database = {
					name,
					uuid: `database-${name.replace('pantrypanic-', '')}`,
					jurisdiction: 'eu' as const
				}
				databases.set(name, database)
				createCalls.push('d1')
				return jsonResponse({ result: database })
			}

			if (path.includes('/r2/buckets/') && method === 'GET') {
				const name = decodeURIComponent(path.split('/').at(-1) ?? '')
				const bucket = buckets.get(name)

				return bucket
					? jsonResponse({ result: bucket })
					: jsonResponse(
							{
								success: false,
								errors: [{ code: 1000, message: 'Not found' }],
								result: null
							},
							404
						)
			}

			if (path.endsWith('/r2/buckets') && method === 'POST') {
				const { name } = JSON.parse(String(init?.body)) as { name: string }
				const bucket = { name, jurisdiction: 'eu' as const }
				buckets.set(name, bucket)
				createCalls.push('r2')
				return jsonResponse({ result: bucket })
			}

			throw new Error(`Unexpected Cloudflare request: ${method} ${path}`)
		}
	)

	return { fetch, createCalls, requests }
}

function jsonResponse(payload: Record<string, unknown>, status = 200) {
	return new Response(JSON.stringify({ success: true, errors: [], ...payload }), {
		status,
		headers: { 'Content-Type': 'application/json' }
	})
}
