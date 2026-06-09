// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
	modules: [
		'@nuxthub/core',
		'nuxt-auth-utils',
		'@nuxt/eslint',
		'@nuxt/ui',
		'@nuxt/image',
		'@pinia/nuxt',
		'@vueuse/nuxt'
	],

	$production: {
		hub: {
			// R2 bucket (binding defaults to 'BLOB')
			blob: {
				driver: 'cloudflare-r2',
				bucketName: process.env.CLOUDFLARE_R2_BUCKET,
				binding: 'BLOB'
			}
		},

		image: {
			provider: 'cloudflare'
		}
	},

	devtools: {
		enabled: true
	},

	css: ['~/assets/css/main.css'],

	runtimeConfig: {
		adminApiKey: process.env.ADMIN_API_KEY ?? process.env.ADMIN_API_TOKEN ?? '',
		adminApiToken: process.env.ADMIN_API_TOKEN ?? '',

		public: {
			identity: {
				title: 'Pantry Panic',
				description: "The grocery list manager that doesn't suck."
			}
		}
	},

	compatibilityDate: '2025-01-15',

	hub: {
		// D1 database
		db: {
			dialect: 'sqlite',
			driver: process.env.NODE_ENV !== 'development' ? 'd1' : undefined,
			applyMigrationsDuringBuild: process.env.NODE_ENV !== 'development' ? false : undefined,
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
		// Local blob storage for development
		blob: {
			driver: 'fs',
			dir: '.data/blob'
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

	eslint: {
		config: {
			stylistic: {
				commaDangle: 'never',
				braceStyle: '1tbs'
			}
		}
	},

	image: {
		provider: 'none'
	}
})
