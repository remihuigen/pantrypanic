import type { BlobSize } from '@nuxthub/core/blob'

declare module '@nuxt/schema' {
	interface RuntimeConfig {
		adminApiKey: string
		enableMultiTenancy: boolean
		enableRegistration: boolean
		session: {
			password: string
			maxAge: number
		}
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
		enableMultiTenancy: boolean
		enableRegistration: boolean
		identity: {
			title: string
			description: string
		}
	}
}

export {}
