# AGENTS.md

Operational contract for AI coding agents working in this repository.

## Critical Rules (MUST)

- You MUST not introduce breaking UX or content-shape changes without explicit request.
- You MUST keep Cloudflare edge/runtime compatibility intact (avoid Node-only APIs in shared/client
  code).
- You MUST not add dependencies unless explicitly requested.
- You MUST preserve existing route/file naming contracts unless explicitly asked to change them.
- You MUST treat `content/` as editor-managed product content; avoid incidental rewrites.
- You MUST keep Docus/Nuxt Content collection contracts stable unless a schema change is requested.
- You MUST keep docs synchronized:
  - `docs/` for humans
  - `.agents/` for agents
  - active information mirrored in both places
- You MUST NOT edit anything under `.agents/skills/**` unless explicitly requested.

## Working Defaults (SHOULD)

- You SHOULD keep presentational concerns in components and reusable logic in composables.
- You SHOULD keep route handlers in `server/api/*` and helper logic in `server/utils/*`.
- You SHOULD use Zod for boundary validation.
- You SHOULD prefer small, scoped changes following existing patterns.

## Commit And PR Rules

- You MUST use Conventional Commit messages.
- Commit header format: `<type>(<optional-scope>): <subject>`.
- Allowed `type` values: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `ci`, `build`,
  `perf`, `revert`.
- You MUST keep commit headers compatible with `commitlint.config.js`.
- You MUST use semantic PR titles that pass `.github/workflows/lint_pr_title.yml`.

## Definition Of Done

1. Relevant checks pass: `pnpm lint` and `pnpm typecheck`.
2. For config/runtime/CI changes: verify affected workflow or runtime path.
3. Content, route, and runtime contracts remain backward-compatible unless explicitly changed.
4. Non-obvious architectural changes are documented in both `docs/` and `.agents/`.

## Rule Priority (When Rules Conflict)

1. User-facing behavior and content/data contracts
2. Runtime/edge compatibility and deployment constraints
3. Correctness and safety for production routes and content serving
4. Existing architecture boundaries and naming contracts
5. Style preferences

## Documentation Map

Human docs (`docs/`):

- Project overview: `README.md`
- Docs index: `docs/README.md`
- Agent collaboration (human side): `docs/agent-guide/README.md`
- Conventions: `docs/conventions/README.md`
- Content and Studio: `docs/content/README.md`
- Config and runtime: `docs/config/README.md`
- Server routes: `docs/server/README.md`
- AI assistant integration: `docs/ai-integration/README.md`
- Sentry: `docs/sentry/README.md`
- CI/CD: `docs/ci-cd/README.md`

Agent docs (`.agents/`):

- Overview and mapping: `.agents/README.md`
- Context: `.agents/context/*`
- Rules: `.agents/rules/*`
- Patterns: `.agents/patterns/*`

## Quick Commands

```bash
pnpm dev
pnpm build
pnpm preview
pnpm lint
pnpm typecheck
```
