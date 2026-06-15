import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

const rootDir = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
	resolve: {
		alias: {
			'#server': fileURLToPath(new URL('./server', import.meta.url)),
			'#shared': fileURLToPath(new URL('./shared', import.meta.url)),
			'~': fileURLToPath(new URL('./app', import.meta.url)),
			'@': fileURLToPath(new URL('./app', import.meta.url)),
			'~~': rootDir,
			'@@': rootDir,
			'hub:db': fileURLToPath(new URL('./tests/mocks/hub-db.ts', import.meta.url))
		}
	},
	test: {
		environment: 'node',
		clearMocks: true,
		restoreMocks: true,
		include: ['tests/unit/**/*.{test,spec}.{ts,js,mjs}'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'lcov'],
			include: ['server/utils/**/*.{ts,js,mjs}', 'scripts/**/*.mjs', 'app/**/*.{ts,js,mjs}'],
			exclude: [
				'**/*.d.ts',
				'app/composables/useStoreRefresh.ts',
				'app/middleware/**',
				'app/plugins/**'
			],
			thresholds: {
				statements: 90,
				branches: 75,
				functions: 85,
				lines: 90
			}
		}
	}
})
