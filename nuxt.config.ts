// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
	modules: [
		'@nuxthub/core',
		'nuxt-auth-utils',
		'@nuxt/eslint',
		'@nuxt/ui',
		'@nuxt/image',
		'@pinia/nuxt',
		'pinia-plugin-persistedstate/nuxt',
		'@vueuse/nuxt'
	],

	$production: {
		nitro: {
			preset: 'cloudflare_module',
			cloudflare: {
				wrangler: {
					name: process.env.CLOUDFLARE_WORKER_NAME ?? 'pantrypanic',
					observability: {
						logs: {
							enabled: true,
							head_sampling_rate: 1,
							invocation_logs: true
						}
					}
				}
			}
		},
		hub: {
			// D1 Database (binding defaults to 'DB')
			db: {
				dialect: 'sqlite',
				driver: 'd1',
				applyMigrationsDuringBuild: false,
				connection: { databaseId: process.env.CLOUDFLARE_D1_DATABASE_ID }
			},

			// KV Storage (binding defaults to 'CACHE')
			cache: {
				driver: 'cloudflare-kv-binding',
				namespaceId: process.env.CLOUDFLARE_CACHE_NAMESPACE_ID
			},

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
		adminApiKey: process.env.ADMIN_API_KEY ?? '',
		pantry: {
			defaultListName: 'Boodschappen',
			defaultUserListLimit: 50,
			maxUserListLimit: 100,
			defaultItemSearchLimit: 10,
			maxItemSearchLimit: 50,
			defaultBlobListLimit: 100,
			maxBlobListLimit: 1000,
			managedBlobMaxUploadSize: '32MB'
		},

		public: {
			refreshInterval: 5000,
			identity: {
				title: 'Pantry Panic',
				description: "The grocery list manager that doesn't suck."
			}
		}
	},

	compatibilityDate: '2025-01-15',

	hub: {
		// D1 database
		db: 'sqlite',
		// Cache KV namespace (binding defaults to 'CACHE')
		cache: true,
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
				'@tiptap/**',
				'sortablejs',
				'@vueuse/gesture'
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
