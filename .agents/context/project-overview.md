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
- public-route startup keeps product-store hydration off `/` and other non-`/app` routes
- Pantry Panic grocery-list UI for lists and list items
- prompt-based PWA update handling plus a manual `/download` install page that triggers the native
  install prompt on demand instead of auto-showing install toasts
- service worker registration scoped to `/app/**` so landing/auth routes stay outside SW control
- landing-page shader imports routed through a local `#shaders-vue` alias to direct runtime modules
- optional Turnstile client/server flow for protected invite acceptance
- optional marketing layer under `layer/marketing` with a local marketing module and Nuxt Content
  collections declared in `content.config.ts`, including shared editorial rendering for `/blog/**`
  and `/legal/**`
- pnpm workspace with the Nuxt app in `apps/nuxt` and an `infra` workspace that scaffolds isolated
  Cloudflare Worker, D1, and R2 resources for staging/production
- manual, environment-selected GitHub deployment workflow; pushes to `main` do not deploy
- human docs under `docs/`

Not implemented yet:

- offline behavior beyond generated service-worker asset caching
- shopping workflow screens

## Core Directories

- `apps/nuxt/app/`: Nuxt frontend; product pages live under `app/pages/app/**` and map to `/app/**`.
- `apps/nuxt/app/stores/`: Pinia domain stores for lists, recipes, and meal planner.
- `apps/nuxt/app/utils/api-client.ts`: shared frontend API wrapper with normalized app errors.
- `apps/nuxt/app/composables/useFormState.ts`: reusable normalized dirty-state helper for edit forms that
  should not call APIs when payloads have not changed.
- `apps/nuxt/app/composables/useStoreRefresh.ts`: route-aware refresh scheduler and reusable polling
  lifecycle helper.
- `apps/nuxt/shared/utils/schemas/domain.ts`: shared Zod schemas and inferred domain types reused by backend
  and frontend.
- `apps/nuxt/shared/types/api.ts`: shared API envelope and app error type contracts.
- `apps/nuxt/server/api/`: server API route handlers.
- `apps/nuxt/server/routes/`: non-API server routes, currently image blob serving.
- `apps/nuxt/server/utils/`: reusable server-side API logic and validation.
- `apps/nuxt/server/db/`: Drizzle schema and generated NuxtHub migrations.
- `apps/nuxt/scripts/`: build-time and CI utilities, currently HTTP admin-user seeding.
- `infra/`: Cloudflare resource scaffold, generated environment resource files, and its isolated tests.
- `.github/workflows/`: CI checks and Cloudflare deployment with D1 migration handling.
- `docs/`: human-facing implementation docs.
- `.agents/`: agent-facing implementation docs and rules.

## Codebase Reality Check

Use current code and current runtime behavior as source of truth. `PLAN.md` describes intended
product direction, not necessarily implemented behavior.
