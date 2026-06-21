import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('layer/marketing/nuxt.config.ts', () => {
	beforeEach(() => {
		vi.resetModules()
		vi.stubGlobal('defineNuxtConfig', (config: unknown) => config)
	})

	afterEach(() => {
		vi.unstubAllGlobals()
	})

	it('registers the content module for the marketing layer', async () => {
		const config = (await import('../../../../layer/marketing/nuxt.config')).default

		expect(config).toEqual({
			modules: ['@nuxt/content']
		})
	})
})
