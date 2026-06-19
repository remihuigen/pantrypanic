import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineOrganization } from 'nuxt-schema-org/schema'
import { join } from 'pathe'

const layerDir = fileURLToPath(new URL('./layer', import.meta.url))

const pantryDefaultListName = process.env.NUXT_PANTRY_DEFAULT_LIST_NAME ?? 'Boodschappen'
const shadersVueRuntimeDir = resolve('./node_modules/shaders/dist/vue')

function readNumberEnv(name: string, fallback: number) {
	const value = process.env[name]

	if (!value) return fallback

	const parsed = Number(value)

	return Number.isFinite(parsed) ? parsed : fallback
}

/**
 * Resolve environment based turnstile token from process.env
 *
 * If in development, the methods return tokens that are always valid
 * @returns An object containing the Turnstile site key and secret key
 */
function resolveTurnstile() {
	const isDev = process.env.NODE_ENV === 'development'

	const turnstileSiteKey =
		process.env.TURNSTILE_SITE_KEY ?? (isDev ? '1x00000000000000000000BB' : undefined)
	const turnstileSecretKey =
		process.env.TURNSTILE_SECRET_KEY ??
		(isDev ? '1x0000000000000000000000000000000AA' : undefined)
	const turnstileEnabled = process.env.ENABLE_TURNSTILE === 'true'
	return { turnstileSiteKey, turnstileSecretKey, turnstileEnabled }
}

// Feature flag
const enableMultiTenancy = process.env.ENABLE_MULTI_TENANCY === 'true'
const enableHouseholdCreation =
	enableMultiTenancy && process.env.ENABLE_HOUSEHOLD_CREATION === 'true'
const enablePublicRegistration =
	enableMultiTenancy && process.env.ENABLE_PUBLIC_REGISTRATION === 'true'
const enableBetaPeriod = process.env.ENABLE_BETA_PERIOD === 'true'
const enableMarketing = process.env.ENABLE_MARKETING === 'true'

const { turnstileSiteKey, turnstileSecretKey, turnstileEnabled } = resolveTurnstile()

const layers: string[] = []
const manualLayerTypeGlobs = {
	app: [join(layerDir, '*/app/**/*'), join(layerDir, '*/modules/*/runtime/**/*')],
	node: [
		join(layerDir, '*/nuxt.config.*'),
		join(layerDir, '*/.config/nuxt.*'),
		join(layerDir, '*/modules/**/*')
	],
	shared: [join(layerDir, '*/shared/**/*')],
	declarations: [join(layerDir, '*/*.d.ts'), join(layerDir, '*/shared/**/*.d.ts')]
}

if (enableMarketing) {
	layers.push('./layer/marketing')
}

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
	extends: layers,
	modules: [
		// Base Modules
		'@nuxthub/core',
		'nuxt-auth-utils',
		'@nuxt/eslint',
		'@nuxt/ui',
		'@nuxt/image',
		'@pinia/nuxt',
		'pinia-plugin-persistedstate/nuxt',
		'@vueuse/nuxt',
		'@vite-pwa/nuxt',
		'nuxt-authorization',
		'motion-v/nuxt',
		'@nuxtjs/turnstile',
		'@nuxtjs/seo'
	],

	$production: {
		nitro: {
			prerender: {
				routes: enableMarketing ? ['/'] : [],
				crawlLinks: false
			},
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
					},
					// Temporary workaround until https://github.com/nuxt-hub/core/issues/908 is fixed
					r2_buckets: [
						{
							binding: 'BLOB',
							bucket_name: process.env.CLOUDFLARE_R2_BUCKET,
							jurisdiction: 'eu'
						}
					]
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

	components: [
		{
			path: '~/components',
			pathPrefix: false
		}
	],

	devtools: {
		enabled: true
	},

	css: ['~/assets/css/main.css'],

	runtimeConfig: {
		adminApiKey: process.env.ADMIN_API_KEY ?? '',
		enableMultiTenancy,
		enableHouseholdCreation,
		enablePublicRegistration,
		enableBetaPeriod,
		session: {
			password: process.env.NUXT_SESSION_PASSWORD ?? '',
			maxAge: 60 * 60 * 24 * 30
		},
		pantry: {
			defaultListName: pantryDefaultListName,
			defaultUserListLimit: readNumberEnv('NUXT_PANTRY_DEFAULT_USER_LIST_LIMIT', 50),
			maxUserListLimit: readNumberEnv('NUXT_PANTRY_MAX_USER_LIST_LIMIT', 100),
			defaultItemSearchLimit: readNumberEnv('NUXT_PANTRY_DEFAULT_ITEM_SEARCH_LIMIT', 10),
			maxItemSearchLimit: readNumberEnv('NUXT_PANTRY_MAX_ITEM_SEARCH_LIMIT', 50),
			defaultBlobListLimit: readNumberEnv('NUXT_PANTRY_DEFAULT_BLOB_LIST_LIMIT', 100),
			maxBlobListLimit: readNumberEnv('NUXT_PANTRY_MAX_BLOB_LIST_LIMIT', 1000),
			managedBlobMaxUploadSize: process.env.NUXT_PANTRY_MANAGED_BLOB_MAX_UPLOAD_SIZE ?? '32MB'
		},
		turnstile: {
			enabled: turnstileEnabled,
			secretKey: turnstileSecretKey
		},

		public: {
			refreshInterval: readNumberEnv('NUXT_PUBLIC_REFRESH_INTERVAL', 5000),
			enableMultiTenancy,
			enableHouseholdCreation,
			enablePublicRegistration,
			enableBetaPeriod,
			enableMarketing,
			identity: {
				title: 'Pantry Panic',
				description: "The grocery list manager that doesn't suck."
			},
			turnstile: {
				enabled: turnstileEnabled,
				siteKey: turnstileSiteKey
			}
		}
	},

	compatibilityDate: '2025-01-15',

	hub: {
		// D1 database
		db: 'sqlite',
		// Local blob storage for development
		blob: {
			driver: 'fs',
			dir: '.data/blob'
		}
	},

	vite: {
		resolve: {
			alias: {
				'#shaders-vue': shadersVueRuntimeDir
			}
		},

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
				'workbox-window',
				'@vueuse/integrations/useSortable',
				'@vueuse/gesture'
			]
		}
	},
	typescript: {
		tsConfig: {
			include: [...manualLayerTypeGlobs.app, ...manualLayerTypeGlobs.declarations]
		},
		nodeTsConfig: {
			include: [...manualLayerTypeGlobs.node]
		},
		sharedTsConfig: {
			include: [...manualLayerTypeGlobs.shared, ...manualLayerTypeGlobs.declarations]
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
	},
	marketing: {
		enabled: enableMarketing
	},
	ogImage: false,

	pwa: {
		registerType: 'prompt',
		scope: '/app/',
		client: {
			installPrompt: 'pantrypanic:hide-install-prompt'
		},

		manifest: {
			id: '/app/',
			name: 'Pantry Panic',
			short_name: 'Pantry Panic',
			description: "The grocery list manager that doesn't suck.",

			start_url: '/app/',
			scope: '/app/',

			display: 'standalone',
			orientation: 'portrait',

			theme_color: '#EB533A',
			background_color: '#FFFFFF',

			lang: 'nl',

			icons: [
				{
					src: '/icons/appicon-192.png',
					sizes: '192x192',
					type: 'image/png'
				},
				{
					src: '/icons/appicon-512.png',
					sizes: '512x512',
					type: 'image/png'
				},
				{
					src: '/icons/maskable-appicon-512.png',
					sizes: '512x512',
					type: 'image/png',
					purpose: 'maskable'
				}
			]
		},

		workbox: {
			globPatterns: ['**/*.{js,css,html,png,svg,ico,webp,json}'],
			navigateFallbackDenylist: [/^\/api/, /^\/app(?:\/.*)?$/]
		},

		devOptions: {
			enabled: false
		}
	},

	schemaOrg: {
		identity: defineOrganization({
			name: 'Pantry Panic',

			// Profile Information, if applicable
			image: '/logo-1200.png',
			description: "The grocery list manager that doesn't suck.",
			url: 'https://pantrypanic.com'
		})
	},

	turnstile: {
		siteKey: turnstileSiteKey
	},
})
