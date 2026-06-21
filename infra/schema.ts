import { z } from 'zod'

import { deploymentEnvironmentValues, resourceJurisdictionValues } from './constants.js'

export const deploymentEnvironmentSchema = z.enum(deploymentEnvironmentValues)

export const scaffoldEnvironmentSchema = z.object({
	CLOUDFLARE_ACCOUNT_ID: z.string().trim().min(1),
	CLOUDFLARE_API_TOKEN: z.string().trim().min(1)
})

export const generatedEnvironmentFileSchema = z.strictObject({
	CLOUDFLARE_ACCOUNT_ID: z.string().trim().min(1),
	CLOUDFLARE_WORKER_NAME: z.string().trim().min(1),
	CLOUDFLARE_D1_DATABASE_ID: z.string().trim().min(1),
	CLOUDFLARE_R2_BUCKET: z.string().trim().min(1),
	CLOUDFLARE_ENV: deploymentEnvironmentSchema
})

const cloudflareErrorSchema = z.object({
	code: z.number().optional(),
	message: z.string().optional()
})

export const cloudflareEnvelopeSchema = z.object({
	success: z.boolean(),
	errors: z.array(cloudflareErrorSchema).default([]),
	result: z.unknown(),
	result_info: z.unknown().optional()
})

export const cloudflarePaginationSchema = z.object({
	page: z.number().int().positive().optional(),
	total_pages: z.number().int().positive().optional()
})

export const d1DatabaseSchema = z.object({
	name: z.string().min(1),
	uuid: z.string().min(1),
	jurisdiction: z.enum(['eu', 'fedramp']).optional()
})

export const r2BucketSchema = z.object({
	name: z.string().min(1),
	jurisdiction: z.enum(['default', 'eu', 'fedramp']).optional()
})

export const scaffoldCliOptionsSchema = z.object({
	environment: deploymentEnvironmentSchema,
	jurisdiction: z.enum(resourceJurisdictionValues).optional(),
	dryRun: z.boolean().default(false)
})

export type DeploymentEnvironmentInput = z.infer<typeof deploymentEnvironmentSchema>
export type GeneratedEnvironmentFile = z.infer<typeof generatedEnvironmentFileSchema>
