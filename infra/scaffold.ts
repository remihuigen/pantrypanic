import type { ZodType } from 'zod'
import type { DeploymentEnvironment, ResourceJurisdiction } from './constants.js'
import type { GeneratedEnvironmentFile } from './schema.js'

import { chmod, mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { cloudflareApiBaseUrl, resourcesByEnvironment } from './constants.js'
import {
	cloudflareEnvelopeSchema,
	cloudflarePaginationSchema,
	d1DatabaseSchema,
	generatedEnvironmentFileSchema,
	r2BucketSchema,
	scaffoldCliOptionsSchema,
	scaffoldEnvironmentSchema
} from './schema.js'

type FetchImplementation = typeof fetch
type EnvironmentVariables = Record<string, string | undefined>

type ScaffoldOptions = {
	environment: DeploymentEnvironment
	jurisdiction?: ResourceJurisdiction
	dryRun?: boolean
	fetchImplementation?: FetchImplementation
	projectRoot?: string
	env?: EnvironmentVariables
	log?: (_message: string) => void
}

type ScaffoldResult = {
	environmentFile?: GeneratedEnvironmentFile
	created: string[]
	wouldCreate: string[]
	dryRun: boolean
}

type CloudflareClient = ReturnType<typeof createCloudflareClient>

class CloudflareApiError extends Error {
	readonly status: number

	constructor(operation: string, status: number, messages: string[]) {
		super(
			`${operation} failed with status ${status}${messages.length ? `: ${messages.join('; ')}` : ''}`
		)
		this.name = 'CloudflareApiError'
		this.status = status
	}
}

/**
 * Idempotently provisions the selected environment's D1 database and R2 bucket. The Worker name
 * is recorded for the first source-controlled deployment, which creates the Worker script.
 * The Cloudflare API token remains in memory and is never written to disk or returned.
 */
export async function scaffoldInfrastructure(options: ScaffoldOptions): Promise<ScaffoldResult> {
	const environment = scaffoldCliOptionsSchema.parse({
		environment: options.environment,
		jurisdiction: options.jurisdiction,
		dryRun: options.dryRun
	})
	const credentials = scaffoldEnvironmentSchema.parse(options.env ?? process.env)
	const log = options.log ?? console.log
	const projectRoot =
		options.projectRoot ?? resolve(fileURLToPath(new URL('..', import.meta.url)))
	const generatedFile = join(projectRoot, 'infra', `.${environment.environment}.env`)
	const resources = resourcesByEnvironment[environment.environment]

	await assertExistingEnvironmentFileMatches({
		path: generatedFile,
		accountId: credentials.CLOUDFLARE_ACCOUNT_ID,
		environment: environment.environment,
		workerName: resources.workerName,
		bucketName: resources.bucketName
	})

	const client = createCloudflareClient({
		accountId: credentials.CLOUDFLARE_ACCOUNT_ID,
		apiToken: credentials.CLOUDFLARE_API_TOKEN,
		fetchImplementation: options.fetchImplementation ?? fetch
	})
	const created: string[] = []
	const wouldCreate: string[] = []

	const database = await ensureD1Database(
		client,
		resources.databaseName,
		environment.dryRun,
		environment.jurisdiction,
		created,
		wouldCreate
	)
	const bucket = await ensureR2Bucket(
		client,
		resources.bucketName,
		environment.dryRun,
		environment.jurisdiction,
		created,
		wouldCreate
	)
	if (environment.dryRun) {
		log(
			`Dry run complete for ${environment.environment}; no Cloudflare resource or file was changed.${
				wouldCreate.length ? ` Would create: ${wouldCreate.join(', ')}.` : ''
			}`
		)
		return { created, wouldCreate, dryRun: true }
	}

	if (!database || !bucket) {
		throw new Error('Scaffolded resources are missing their required D1 or R2 identifiers.')
	}

	const environmentFile = generatedEnvironmentFileSchema.parse({
		CLOUDFLARE_ACCOUNT_ID: credentials.CLOUDFLARE_ACCOUNT_ID,
		CLOUDFLARE_WORKER_NAME: resources.workerName,
		CLOUDFLARE_D1_DATABASE_ID: database.uuid,
		CLOUDFLARE_R2_BUCKET: bucket.name,
		CLOUDFLARE_ENV: environment.environment
	})

	await writeEnvironmentFile(generatedFile, environmentFile)
	log(`Wrote ${relativeToProject(projectRoot, generatedFile)}.`)

	return { environmentFile, created, wouldCreate, dryRun: false }
}

function createCloudflareClient(options: {
	accountId: string
	apiToken: string
	fetchImplementation: FetchImplementation
}) {
	const accountPath = `${cloudflareApiBaseUrl}/accounts/${encodeURIComponent(options.accountId)}`

	async function request<T>(
		operation: string,
		path: string,
		init?: Parameters<FetchImplementation>[1]
	): Promise<{ result: T; resultInfo?: unknown }> {
		const response = await options.fetchImplementation(`${accountPath}${path}`, {
			...init,
			headers: {
				Authorization: `Bearer ${options.apiToken}`,
				...(init?.headers ?? {})
			}
		})
		const payload = await parseResponseJson(response, operation)
		const envelope = cloudflareEnvelopeSchema.safeParse(payload)

		if (!response.ok || !envelope.success || !envelope.data.success) {
			throw new CloudflareApiError(
				operation,
				response.status,
				envelope.success
					? envelope.data.errors.map(
							(error: { code?: number; message?: string }) =>
								error.message ?? `Cloudflare error ${error.code ?? ''}`
						)
					: []
			)
		}

		return {
			result: envelope.data.result as T,
			resultInfo: envelope.data.result_info
		}
	}

	return {
		async listD1Databases() {
			return await listPages(clientListD1Databases)
		},
		async createD1Database(name: string, jurisdiction?: ResourceJurisdiction) {
			return d1DatabaseSchema.parse(
				(
					await request<unknown>('Create D1 database', '/d1/database', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ name, ...(jurisdiction ? { jurisdiction } : {}) })
					})
				).result
			)
		},
		async getR2Bucket(name: string) {
			try {
				return r2BucketSchema.parse(
					(
						await request<unknown>(
							'Get R2 bucket',
							`/r2/buckets/${encodeURIComponent(name)}`
						)
					).result
				)
			} catch (error) {
				if (error instanceof CloudflareApiError && error.status === 404) {
					return null
				}

				throw error
			}
		},
		async createR2Bucket(name: string, jurisdiction?: ResourceJurisdiction) {
			return r2BucketSchema.parse(
				(
					await request<unknown>('Create R2 bucket', '/r2/buckets', {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							...(jurisdiction ? { 'cf-r2-jurisdiction': jurisdiction } : {})
						},
						body: JSON.stringify({ name })
					})
				).result
			)
		}
	}

	async function clientListD1Databases(page: number) {
		const result = await request<unknown>(
			'List D1 databases',
			`/d1/database?page=${page}&per_page=100`
		)
		return parseListResult(result, d1DatabaseSchema)
	}
}

async function ensureD1Database(
	client: CloudflareClient,
	name: string,
	dryRun: boolean,
	jurisdiction: ResourceJurisdiction | undefined,
	created: string[],
	wouldCreate: string[]
) {
	const existing = (await client.listD1Databases()).find((database) => database.name === name)

	if (existing) {
		assertJurisdiction(name, jurisdiction, existing.jurisdiction)
		return existing
	}

	if (dryRun) {
		wouldCreate.push(`D1 database ${name}`)
		return null
	}

	const database = await client.createD1Database(name, jurisdiction)
	assertJurisdiction(name, jurisdiction, database.jurisdiction)
	created.push(`D1 database ${name}`)
	return database
}

async function ensureR2Bucket(
	client: CloudflareClient,
	name: string,
	dryRun: boolean,
	jurisdiction: ResourceJurisdiction | undefined,
	created: string[],
	wouldCreate: string[]
) {
	const existing = await client.getR2Bucket(name)

	if (existing) {
		assertJurisdiction(name, jurisdiction, existing.jurisdiction)
		return existing
	}

	if (dryRun) {
		wouldCreate.push(`R2 bucket ${name}`)
		return null
	}

	const bucket = await client.createR2Bucket(name, jurisdiction)
	assertJurisdiction(name, jurisdiction, bucket.jurisdiction)
	created.push(`R2 bucket ${name}`)
	return bucket
}

async function listPages<T>(
	fetchPage: (_page: number) => Promise<{ items: T[]; totalPages?: number }>
) {
	const items: T[] = []

	for (let page = 1; ; page += 1) {
		const result = await fetchPage(page)
		items.push(...result.items)

		if (!result.totalPages || page >= result.totalPages) {
			return items
		}
	}
}

function parseListResult<T>(
	value: { result: unknown; resultInfo?: unknown },
	itemSchema: ZodType<T>
) {
	const result = itemSchema.array().parse(value.result)
	const pagination = cloudflarePaginationSchema.safeParse(value.resultInfo)

	return {
		items: result,
		totalPages: pagination.success ? pagination.data.total_pages : undefined
	}
}

async function parseResponseJson(response: Response, operation: string): Promise<unknown> {
	try {
		return await response.json()
	} catch {
		throw new CloudflareApiError(operation, response.status, [
			'Cloudflare returned an invalid JSON response.'
		])
	}
}

function assertJurisdiction(
	name: string,
	expectedJurisdiction: ResourceJurisdiction | undefined,
	actualJurisdiction: string | undefined
) {
	if (expectedJurisdiction && actualJurisdiction && actualJurisdiction !== expectedJurisdiction) {
		throw new Error(
			`Resource ${name} is in ${actualJurisdiction}, but ${expectedJurisdiction} was requested.`
		)
	}
}

async function assertExistingEnvironmentFileMatches(options: {
	path: string
	accountId: string
	environment: DeploymentEnvironment
	workerName: string
	bucketName: string
}) {
	let contents: string

	try {
		contents = await readFile(options.path, 'utf8')
	} catch (error) {
		if (isMissingFileError(error)) {
			return
		}

		throw error
	}

	const existing = generatedEnvironmentFileSchema.parse(parseDotenv(contents))

	if (
		existing.CLOUDFLARE_ACCOUNT_ID !== options.accountId ||
		existing.CLOUDFLARE_ENV !== options.environment ||
		existing.CLOUDFLARE_WORKER_NAME !== options.workerName ||
		existing.CLOUDFLARE_R2_BUCKET !== options.bucketName
	) {
		throw new Error(
			`Existing ${options.path} does not match the selected Pantry Panic environment.`
		)
	}
}

async function writeEnvironmentFile(path: string, environment: GeneratedEnvironmentFile) {
	await mkdir(dirname(path), { recursive: true })

	const content = [
		'# Generated by pnpm infra:scaffold. Do not store secrets in this file.',
		`CLOUDFLARE_ACCOUNT_ID=${environment.CLOUDFLARE_ACCOUNT_ID}`,
		`CLOUDFLARE_WORKER_NAME=${environment.CLOUDFLARE_WORKER_NAME}`,
		`CLOUDFLARE_D1_DATABASE_ID=${environment.CLOUDFLARE_D1_DATABASE_ID}`,
		`CLOUDFLARE_R2_BUCKET=${environment.CLOUDFLARE_R2_BUCKET}`,
		`CLOUDFLARE_ENV=${environment.CLOUDFLARE_ENV}`,
		''
	].join('\n')
	const temporaryPath = `${path}.tmp`

	await writeFile(temporaryPath, content, { mode: 0o600 })
	await rename(temporaryPath, path)
	await chmod(path, 0o600)
}

function parseDotenv(contents: string) {
	const entries = contents
		.split('\n')
		.map((line) => line.trim())
		.filter((line) => line && !line.startsWith('#'))
		.map((line) => {
			const separator = line.indexOf('=')

			if (separator < 1) {
				throw new Error('Generated environment files must contain KEY=VALUE entries.')
			}

			return [line.slice(0, separator), line.slice(separator + 1)] as const
		})

	return Object.fromEntries(entries)
}

function isMissingFileError(error: unknown): error is { code?: unknown } {
	return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT'
}

function relativeToProject(projectRoot: string, path: string) {
	return path.startsWith(projectRoot) ? path.slice(projectRoot.length + 1) : path
}

function parseCliArguments(argv: string[]) {
	let environment: string | undefined
	let jurisdiction: string | undefined
	let dryRun = false

	for (let index = 0; index < argv.length; index += 1) {
		const argument = argv[index]

		if (argument === '--environment') {
			environment = argv[index + 1]
			index += 1
			continue
		}

		if (argument === '--dry-run') {
			dryRun = true
			continue
		}

		if (argument === '--jurisdiction') {
			jurisdiction = argv[index + 1]
			index += 1
			continue
		}

		throw new Error(`Unknown scaffold option: ${argument}`)
	}

	return scaffoldCliOptionsSchema.parse({ environment, jurisdiction, dryRun })
}

async function runCli() {
	const options = parseCliArguments(process.argv.slice(2))
	const result = await scaffoldInfrastructure(options)

	if (result.created.length > 0) {
		console.log(`Created: ${result.created.join(', ')}.`)
	}
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	runCli().catch((error: unknown) => {
		const message =
			error instanceof Error ? error.message : 'Infrastructure scaffolding failed.'
		console.error(message)
		process.exitCode = 1
	})
}
