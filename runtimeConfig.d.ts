import type { BlobSize } from '@nuxthub/core/blob'

declare module 'nuxt/schema' {
	interface RuntimeConfig {
		adminApiKey: string
		pantry: {
			defaultListName: string
			defaultUserListLimit: number
			maxUserListLimit: number
			defaultItemSearchLimit: number
			maxItemSearchLimit: number
			defaultBlobListLimit: number
			maxBlobListLimit: number
			managedBlobMaxUploadSize: BlobSize
		}
	}

	interface PublicRuntimeConfig {
		refreshInterval: number
		identity: {
			title: string
			description: string
		}
	}
}

export {}
