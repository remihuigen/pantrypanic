# Database (Agent)

## Current Schema

The active schema is in `server/db/schema.ts`.

Current tables:

- `users`
  - `id`: integer primary key, autoincrement
  - `name`: required text
  - `email`: required unique text
  - `password`: required text, stores a scrypt hash for new/updated users
  - `avatar_pathname`: optional blob pathname for the profile avatar
  - `createdAt`: required timestamp integer
- `households`
- `household_users`
  - includes `role`: `member` or `householdOwner`
- `household_settings`
- `access_links`
- `lists`
- `item_categories`
- `list_category_positions`
- `items`
- `recipes`
- `recipe_items`
- `list_items`
- `meal_planner_days`
- `meal_planner_day_items`

Domain table ids are text UUID v7 ids created with the `uuid` package.

Domain database column names use snake_case while TypeScript schema properties use camelCase.

Canonical items and list-item occurrences can both reference `item_categories`. `items.category_id`
is the canonical default category used when future list items are created from that item.
`list_items.category_id` is the occurrence category used by shopping-list grouping. Dragging items
between category groups updates the list-item category, not the canonical item category.
`list_category_positions` stores per-list category ordering.

Current migration files live under `server/db/migrations/sqlite/`.

## Current Database Usage

- Runtime API access uses NuxtHub DB through `hub:db`.
- User query/mutation logic lives in `server/utils/user-management.ts`.
- Domain id helper logic lives in `server/utils/api-helpers.ts`.
- Pantry item normalization, canonical item reuse, seed logic, and domain query/mutation logic are
  split across `server/utils/domains/*` with a route-facing re-export in `server/domains.ts`.
- Category normalization and category CRUD/merge/delete logic live in
  `server/utils/domains/categories.ts`.
- Route envelope and API-boundary helpers live in `server/utils/api-core.ts`.
- Build-time admin seeding uses `scripts/seed-admin-user.mjs` to call the configured HTTP instance
  at `NUXT_PUBLIC_SITE_URL` with `x-api-token: ADMIN_API_KEY`.
- The admin seed runs from Nuxt `build:done` and creates the user through `POST /api/users` only
  when `GET /api/users?email=<email>&limit=1` returns no matching user.
- `createUser()` creates/joins the default household and seeds household domain data by default.
  The created/default membership is a `householdOwner`.
  Invite onboarding can opt out of default-household seeding and attach the new user only to the
  invited household.
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
- `householdUserRoleValues`: `member`, `householdOwner`

## Domain Seed Data

Seeded domain data:

- one default household named `Thuis` when needed
- household-owner user membership in that household for default/self-hosted flows
- one active list using `runtimeConfig.pantry.defaultListName` (default `Boodschappen`)
- seven `meal_planner_days` rows, day 1 through day 7, all `empty`

Seed audit user:

- existing first user during migration, when one exists
- newly created user in the user creation helper for fresh deployments

## Prompt Deviations

- Audit user columns are integer foreign keys because existing `users.id` is integer.
- New domain DB columns are snake_case; TypeScript properties remain camelCase.
- Seed data is split between migration SQL and user-creation helper for idempotency across existing
  and fresh deployments.

## Implemented Domain API Work

The database layer is currently exercised through authenticated API routes for:

- shopping lists and list items
- canonical item search and suggestions
- item-category maintenance and grouped list-item ordering
- recipes and recipe items
- one seven-day meal planner per household
- household settings, members, access links, profile, canonical-item maintenance, clear-data, and
  usage stats

All domain data APIs must be scoped to the active household context. Household management actions
are owner-gated with Nuxt Authorization abilities. Lists, recipes, and list items use status fields
for soft deletion. Recipe items and meal-planner-day placeholder items are hard-deleted as volatile
child/draft data. Canonical item deletion from settings also hard-deletes associated list,
recipe-item, and meal-planner-day item references. Destroying a household hard-deletes its domain
data, settings, access links, and memberships, but leaves user accounts orphaned.

## Migration Rules

- Modify schema in `server/db/schema.ts` or `server/db/schema/**`.
- Generate migrations with `pnpm db:generate`.
- Apply migrations with `pnpm db:migrate` or by running Nuxt/NuxtHub dev/build flows.
- Production D1 deployments apply migrations in `.github/workflows/deploy.yml` before
  `wrangler deploy`.
- Do not hand-write files in `server/db/migrations/**` unless explicitly requested.

## Runtime Constraints

- Keep server/runtime database code compatible with Cloudflare edge/runtime constraints.
- Keep Node-only database code out of Nitro route handlers.
