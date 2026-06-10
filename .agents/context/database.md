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
- `lists`
- `items`
- `recipes`
- `recipe_items`
- `list_items`
- `meal_planner_days`
- `meal_planner_day_items`

Domain table ids are text UUID v7 ids created with the `uuid` package.

Domain database column names use snake_case while TypeScript schema properties use camelCase.

Current migration files live under `server/db/migrations/sqlite/`.

## Current Database Usage

- Runtime API access uses NuxtHub DB through `hub:db`.
- User query/mutation logic lives in `server/utils/user-management.ts`.
- Domain id, item normalization, canonical item reuse, and domain seed helpers live in
  `server/utils/domain-ids.ts` and `server/utils/domain-data.ts`.
- Build-time admin seeding uses `scripts/seed-admin-user.mjs` to call the configured HTTP instance
  at `NUXT_PUBLIC_SITE_URL` with `x-api-token: ADMIN_API_KEY`.
- The admin seed runs from Nuxt `build:done` and creates the user through `POST /api/users` only
  when `GET /api/users?email=<email>&limit=1` returns no matching user.
- `createUser()` calls `seedInitialDomainData(user.id)` after creating a user, so fresh deployments
  seed the default list and meal planner immediately after the initial admin user is created.
- Migration `0001_worried_jasper_sitwell.sql` also seeds default domain rows when at least one user
  already exists before the migration runs.
- User create/update flows hash passwords before storing them.
- Legacy plain-text passwords from earlier local data are rehashed after successful login.

## Domain Enums

- `listStatusValues`: `active`, `archived`, `deleted`
- `listItemStatusValues`: `unchecked`, `checked`, `archived`, `deleted`
- `recipeStatusValues`: `active`, `archived`, `deleted`
- `listItemSourceTypeValues`: `manual`, `recipe`, `meal_planner_recipe`, `meal_planner_placeholder`
- `mealPlannerDayTypeValues`: `empty`, `recipe`, `placeholder`

## Domain Seed Data

Seeded domain data:

- one active `Groceries` list
- seven `meal_planner_days` rows, day 1 through day 7, all `empty`

Seed audit user:

- existing first user during migration, when one exists
- newly created user in the user creation helper for fresh deployments

## Prompt Deviations

- Audit user columns are integer foreign keys because existing `users.id` is integer.
- New domain DB columns are snake_case; TypeScript properties remain camelCase.
- Seed data is split between migration SQL and user-creation helper for idempotency across existing
  and fresh deployments.

## Planned API Work

`PLAN.md` describes future behavior that is not implemented yet:

- list APIs
- item search/autocomplete APIs
- recipe APIs
- meal-planner APIs

## Migration Rules

- Modify schema in `server/db/schema.ts` or `server/db/schema/**`.
- Generate migrations with `pnpm db:generate`.
- Apply migrations with `pnpm db:migrate` or by running Nuxt/NuxtHub dev/build flows.
- Production D1 deployments apply migrations in `.github/workflows/deploy.yml` before `wrangler deploy`.
- Do not hand-write files in `server/db/migrations/**` unless explicitly requested.

## Runtime Constraints

- Keep server/runtime database code compatible with Cloudflare edge/runtime constraints.
- Keep Node-only database code out of Nitro route handlers.
