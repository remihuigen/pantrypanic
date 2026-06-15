# Project Overview (Agent)

## Product Direction

Pantry Panic is planned as a private, installable grocery list app for small households.

The product plan in `PLAN.md` emphasizes:

- fast mobile-first grocery-list workflows
- two-person household usage as the initial target
- long-lived reusable lists
- historical item data instead of destructive deletion
- recipes as templates that add new list-item records
- simple cookie/session authentication in the MVP
- polling rather than WebSockets for realtime-ish updates

## Current Implementation

The codebase is currently an early Nuxt 4 application, not a finished Pantry Panic product.

Implemented:

- Nuxt UI app shell under `app/`, with product routes namespaced under `/app`
- Nuxt UI `login` and `logout` pages outside the `/app` namespace
- nuxt-auth-utils session login/logout flow
- server authentication guard for `/api/**` and `/images/**`
- NuxtHub database configuration
- `users` table and Pantry Panic domain tables/migrations
- user CRUD API routes
- blob CRUD/validation API routes
- Pantry Panic domain API routes for lists, list items, items, recipes, recipe items, and meal
  planner workflows
- household-scoped multi-tenancy data model with singleton behavior when `ENABLE_MULTI_TENANCY` is
  disabled
- settings subroutes for profile/theme/danger-zone controls, household
  members/invites/reset links/settings, canonical item maintenance, and usage stats
- household-owner role checks for household management actions through Nuxt Authorization
- safe raster image serving from blob storage
- build-time HTTP admin-user seed from `.env`
- Pinia-based frontend data layer with normalized entity stores, API envelope wrapper, optimistic
  updates, and one route-aware polling refresh scheduler
- Pantry Panic grocery-list UI for lists and list items
- prompt-based PWA update and Chromium-style install prompt handling
- human docs under `docs/`

Not implemented yet:

- offline behavior beyond generated service-worker asset caching
- shopping workflow screens

## Core Directories

- `app/`: Nuxt frontend; product pages live under `app/pages/app/**` and map to `/app/**`.
- `app/stores/`: Pinia domain stores for lists, recipes, and meal planner.
- `app/utils/api-client.ts`: shared frontend API wrapper with normalized app errors.
- `app/composables/useFormState.ts`: reusable normalized dirty-state helper for edit forms that
  should not call APIs when payloads have not changed.
- `app/composables/useStoreRefresh.ts`: route-aware refresh scheduler and reusable polling
  lifecycle helper.
- `shared/utils/schemas/domain.ts`: shared Zod schemas and inferred domain types reused by backend
  and frontend.
- `shared/types/api.ts`: shared API envelope and app error type contracts.
- `server/api/`: server API route handlers.
- `server/routes/`: non-API server routes, currently image blob serving.
- `server/utils/`: reusable server-side API logic and validation.
- `server/db/`: Drizzle schema and generated NuxtHub migrations.
- `scripts/`: build-time and CI utilities, currently HTTP admin-user seeding.
- `.github/workflows/`: CI checks and Cloudflare deployment with D1 migration handling.
- `docs/`: human-facing implementation docs.
- `.agents/`: agent-facing implementation docs and rules.

## Codebase Reality Check

Use current code and current runtime behavior as source of truth. `PLAN.md` describes intended
product direction, not necessarily implemented behavior.
