# Testing

## Unit Tests

Vitest is configured in `vitest.config.ts`.

The current suite tests TypeScript and JavaScript logic in:

- `server/utils/**/*`
- `scripts/**/*.mjs`

Vue single-file components are intentionally excluded from coverage in this pass.

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
