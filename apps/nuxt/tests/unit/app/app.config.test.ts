import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('app/app.config.ts', () => {
	beforeEach(() => {
		vi.resetModules()
		vi.stubGlobal('defineAppConfig', (config: unknown) => config)
	})

	afterEach(() => {
		vi.unstubAllGlobals()
	})

	it('exports the expected ui theme configuration', async () => {
		const config = (await import('~/app.config')).default

		expect(config).toMatchObject({
			ui: {
				colors: {
					primary: 'pomegranate',
					secondary: 'black-pearl',
					neutral: 'mist'
				},
				formField: {
					slots: {
						label: 'font-bold',
						description: 'mb-2',
						root: 'grid'
					}
				}
			}
		})
		expect(config.ui.input.compoundVariants).toHaveLength(5)
		expect(config.ui.select.compoundVariants).toHaveLength(5)
	})
})
