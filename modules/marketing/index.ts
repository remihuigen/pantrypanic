import { addRouteMiddleware, createResolver, defineNuxtModule, useLogger } from '@nuxt/kit'

const MODULE = 'marketing'

export default defineNuxtModule<{ enabled?: boolean }>({
	meta: {
		name: MODULE,
		configKey: MODULE
	},
	setup(options, _nuxt) {
		const logger = useLogger(MODULE)
		const resolver = createResolver(import.meta.url)
		if (!options.enabled) {
			logger.info(
				'Marketing module is disabled, adding middleware to prevent access to marketing routes'
			)
			addRouteMiddleware({
				global: true,
				name: 'marketing-disabled',
				path: resolver.resolve('./middleware/marketing-disabled')
			})
		}
	}
})
