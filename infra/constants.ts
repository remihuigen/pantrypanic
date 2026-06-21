export const cloudflareApiBaseUrl = 'https://api.cloudflare.com/client/v4'

export const deploymentEnvironmentValues = ['staging', 'production'] as const

export type DeploymentEnvironment = (typeof deploymentEnvironmentValues)[number]

/** Jurisdictions accepted by both the D1 and R2 creation APIs. */
export const resourceJurisdictionValues = ['eu', 'fedramp'] as const

export type ResourceJurisdiction = (typeof resourceJurisdictionValues)[number]

type ResourceNames = {
	workerName: string
	databaseName: string
	bucketName: string
}

/**
 * Cloudflare resource names managed by the scaffold. Keep production names aligned with already
 * deployed resources so the scaffold adopts them instead of creating replacements.
 */
export const resourcesByEnvironment: Record<DeploymentEnvironment, ResourceNames> = {
	staging: {
		workerName: 'pantrypanic-staging',
		databaseName: 'pantrypanic-staging',
		bucketName: 'pantrypanic-staging'
	},
	production: {
		workerName: 'pantrypanic',
		databaseName: 'pantrypanic',
		bucketName: 'pantrypanic'
	}
}
