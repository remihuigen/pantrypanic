# Operational Contract (Agent)

Primary human source: `AGENTS.md`.

## MUST

- Do not introduce breaking UX/content-shape changes unless requested.
- Preserve Cloudflare edge/runtime compatibility.
- Do not add dependencies unless requested.
- Preserve established naming and file contracts unless requested.
- Keep active docs synchronized across `docs/` and `.agents/`.
- Do not edit `.agents/skills/**` unless explicitly requested.

## SHOULD

- Keep UI logic in components/layouts and reusable behavior in composables.
- Keep API boundary code in `server/api/*` and helper logic in `server/utils/*`.
- Use Zod for boundary validation.
- Prefer small scoped diffs.

## Validation Baseline

Run for meaningful changes:

- `pnpm lint`
- `pnpm typecheck`

## Priority Order

1. User-facing behavior/contracts
2. Runtime and deployment safety
3. Correctness
4. Architecture consistency
5. Style
