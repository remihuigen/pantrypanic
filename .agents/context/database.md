# Database (Agent)

## Current Schema

The active schema is in `server/db/schema.ts`.

Current tables:

- `users`
  - `id`: integer primary key, autoincrement
  - `name`: required text
  - `email`: required unique text
  - `password`: required text, stores a scrypt hash for new/updated users
  - `createdAt`: required timestamp integer

Current migration files live under `server/db/migrations/sqlite/`.

## Current Database Usage

- Runtime API access uses NuxtHub DB through `hub:db`.
- User query/mutation logic lives in `server/utils/user-management.ts`.
- Build-time admin seeding uses `scripts/seed-admin-user.mjs` to call the configured HTTP instance
  at `NUXT_PUBLIC_SITE_URL` with `x-api-token: ADMIN_API_KEY`.
- The admin seed runs from Nuxt `build:done` and creates the user through `POST /api/users` only
  when `GET /api/users?email=<email>&limit=1` returns no matching user.
- User create/update flows hash passwords before storing them.
- Legacy plain-text passwords from earlier local data are rehashed after successful login.

## Planned Domain Tables

`PLAN.md` describes future domain models that are not implemented yet:

- lists
- items
- list items
- recipes
- recipe ingredients

Do not document these as active schema until migrations exist.

## Migration Rules

- Modify schema in `server/db/schema.ts` or `server/db/schema/**`.
- Generate migrations with `pnpm db:generate`.
- Apply migrations with `pnpm db:migrate` or by running Nuxt/NuxtHub dev/build flows.
- Production D1 deployments apply migrations in `.github/workflows/deploy.yml` before `wrangler deploy`.
- Do not hand-write files in `server/db/migrations/**` unless explicitly requested.

## Runtime Constraints

- Keep server/runtime database code compatible with Cloudflare edge/runtime constraints.
- Keep Node-only database code out of Nitro route handlers.
