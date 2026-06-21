# Testing

## Unit Tests

The Nuxt app's Vitest configuration lives in `apps/nuxt/vitest.config.ts`.

Nuxt unit tests live under `apps/nuxt/tests/unit/` and mirror the source tree they cover.

Examples:

- `apps/nuxt/app/composables/useTurnstile.ts` →
  `apps/nuxt/tests/unit/app/composables/useTurnstile.test.ts`
- `apps/nuxt/server/utils/turnstile.ts` → `apps/nuxt/tests/unit/server/utils/turnstile.test.ts`
- `apps/nuxt/modules/marketing/index.ts` → `apps/nuxt/tests/unit/modules/marketing/index.test.ts`
- `apps/nuxt/layer/marketing/nuxt.config.ts` →
  `apps/nuxt/tests/unit/layer/marketing/nuxt.config.test.ts`

Shared Nuxt test-only helpers live in `apps/nuxt/tests/support/`. Stubbed runtime adapters such as
the mocked NuxtHub DB binding live in `apps/nuxt/tests/mocks/`.

Infrastructure scaffold tests live in `infra/tests/` and use mocked Cloudflare API responses; they
never require Cloudflare credentials or create remote resources.

The current coverage run includes TypeScript and JavaScript logic in:

- `apps/nuxt/app/**/*.{ts,js,mjs}`
- `apps/nuxt/server/utils/**/*.{ts,js,mjs}`
- `apps/nuxt/scripts/**/*.mjs`
- `apps/nuxt/modules/**/*.{ts,js,mjs}`
- `apps/nuxt/layer/**/*.{ts,js,mjs}`
- `apps/nuxt/content.config.ts`

Vue single-file components are still outside this coverage scope because the include list targets
logic/config files rather than `.vue` files.

## Commands

```bash
pnpm test
pnpm test:run
pnpm test:coverage
```

`pnpm test:coverage` enforces the existing Nuxt-app coverage thresholds and also runs the infra unit
suite:

- statements: 90%
- lines: 90%
- functions: 90%
- branches: 80%

## CI/CD

Pull request code quality and staged deployment workflows run `pnpm test:coverage`.
