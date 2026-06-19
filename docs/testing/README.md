# Testing

## Unit Tests

Vitest is configured in `vitest.config.ts`.

Unit tests live under `tests/unit/` and mirror the source tree they cover.

Examples:

- `app/composables/useTurnstile.ts` → `tests/unit/app/composables/useTurnstile.test.ts`
- `server/utils/turnstile.ts` → `tests/unit/server/utils/turnstile.test.ts`
- `modules/marketing/index.ts` → `tests/unit/modules/marketing/index.test.ts`
- `layer/marketing/nuxt.config.ts` → `tests/unit/layer/marketing/nuxt.config.test.ts`

Shared test-only helpers live in `tests/support/`. Stubbed runtime adapters such as the mocked
NuxtHub DB binding live in `tests/mocks/`.

The current coverage run includes TypeScript and JavaScript logic in:

- `app/**/*.{ts,js,mjs}`
- `server/utils/**/*.{ts,js,mjs}`
- `scripts/**/*.mjs`
- `modules/**/*.{ts,js,mjs}`
- `layer/**/*.{ts,js,mjs}`
- `content.config.ts`

Vue single-file components are still outside this coverage scope because the include list targets
logic/config files rather than `.vue` files.

## Commands

```bash
pnpm test
pnpm test:run
pnpm test:coverage
```

`pnpm test:coverage` enforces global coverage thresholds:

- statements: 90%
- lines: 90%
- functions: 90%
- branches: 80%

## CI/CD

Pull request code quality and production deployment workflows run `pnpm test:coverage`.
