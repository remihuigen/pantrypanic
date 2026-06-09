// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
	modules: [
		'@nuxthub/core',
		'@nuxt/eslint',
		'@nuxt/ui',
		'@nuxt/image',
		'@pinia/nuxt',
		'@vueuse/nuxt'
	],

	devtools: {
		enabled: true
	},

	css: ['~/assets/css/main.css'],

	routeRules: {
		'/': { prerender: true }
	},

	compatibilityDate: '2025-01-15',

	eslint: {
		config: {
			stylistic: {
				commaDangle: 'never',
				braceStyle: '1tbs'
			}
		}
	},

	vite: {
		optimizeDeps: {
			include: [
				'@vue/devtools-core',
				'@vue/devtools-kit',
				'zod',
				'@tiptap/core',
				'@tiptap/starter-kit',
				'@tiptap/markdown',
				'@tiptap/**'
			]
		}
	},

	hub: {
		// D1 database
		db: {
			dialect: 'sqlite',
			driver: process.env.NODE_ENV !== 'development' ? 'd1' : undefined,
			connection:
				process.env.NODE_ENV !== 'development'
					? { databaseId: process.env.CLOUDFLARE_D1_DATABASE_ID }
					: undefined
		},
		// Cache KV namespace (binding defaults to 'CACHE')
		cache:
			process.env.NODE_ENV !== 'development'
				? {
						driver: 'cloudflare-kv-binding',
						namespaceId: process.env.CLOUDFLARE_CACHE_NAMESPACE_ID
					}
				: undefined,
		// R2 bucket (binding defaults to 'BLOB')
		blob: {
			driver: 'cloudflare-r2',
			bucketName: process.env.CLOUDFLARE_R2_BUCKET,
			binding: 'BLOB'
		}
	}
})
