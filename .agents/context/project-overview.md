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

- Nuxt UI starter shell under `app/`
- Nuxt UI `login` and `logout` pages
- nuxt-auth-utils session login/logout flow
- server authentication guard for `/api/**` and `/images/**`
- NuxtHub database configuration
- `users` table and Pantry Panic domain tables/migrations
- user CRUD API routes
- blob CRUD/validation API routes
- Pantry Panic domain API routes for lists, list items, items, recipes, recipe items, and meal planner workflows
- safe raster image serving from blob storage
- build-time HTTP admin-user seed from `.env`
- human docs under `docs/`

Not implemented yet:

- Pantry Panic grocery-list UI
- fine-grained permissions around API routes
- PWA install/offline behavior
- shopping workflow screens

## Core Directories

- `app/`: current Nuxt UI starter frontend.
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
