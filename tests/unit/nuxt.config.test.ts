import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('nuxt-schema-org/schema', () => ({
	defineOrganization: (value: unknown) => value
}))

describe('nuxt.config.ts', () => {
	beforeEach(() => {
		vi.resetModules()
		vi.stubGlobal('defineNuxtConfig', (config: unknown) => config)
	})

	afterEach(() => {
		delete process.env.ENABLE_MARKETING
		vi.unstubAllGlobals()
	})

	it('includes the manual marketing layer TS globs when marketing is enabled', async () => {
		process.env.ENABLE_MARKETING = 'true'

		const config = (await import('../../nuxt.config')).default

		expect(config.extends).toEqual(['./layer/marketing'])
		expect(config.typescript.tsConfig.include).toEqual([
			expect.stringContaining('/layer/*/app/**/*'),
			expect.stringContaining('/layer/*/modules/*/runtime/**/*'),
			expect.stringContaining('/layer/*/*.d.ts'),
			expect.stringContaining('/layer/*/shared/**/*.d.ts')
		])
		expect(config.typescript.nodeTsConfig.include).toEqual(
			expect.arrayContaining([expect.stringContaining('/layer/*/nuxt.config.*')])
		)
	})

	it('omits the marketing layer TS globs when marketing is disabled', async () => {
		process.env.ENABLE_MARKETING = 'false'

		const config = (await import('../../nuxt.config')).default

		expect(config.extends).toEqual([])
		expect(config.typescript.tsConfig.include).toEqual([])
		expect(config.typescript.nodeTsConfig.include).toEqual(
			expect.arrayContaining([expect.stringContaining('/types/**/*.d.ts')])
		)
		expect(config.typescript.nodeTsConfig.include).toEqual(
			expect.not.arrayContaining([expect.stringContaining('/layer/marketing/')])
		)
		expect(config.typescript.sharedTsConfig.include).toEqual(
			expect.arrayContaining([expect.stringContaining('/types/**/*.d.ts')])
		)
		expect(config.typescript.sharedTsConfig.include).toEqual(
			expect.not.arrayContaining([expect.stringContaining('/layer/marketing/')])
		)
	})
})
