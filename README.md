# Pantry Panic

Pantry Panic is a private, installable grocery list app for small households.

The product goal, captured in [PLAN.md](./PLAN.md), is a fast mobile-first grocery list manager for
two household users. The current codebase is still early in implementation: the frontend is mostly
the Nuxt UI starter shell, while the backend now has initial user and blob-management APIs.

## Current State

Implemented:

- Nuxt 4 app with Nuxt UI, Pinia, VueUse, Nuxt Image, NuxtHub, nuxt-auth-utils, Drizzle, and Zod.
- Email/password login, logout, and session management.
- Server-route authentication guard using sessions or `x-api-token`.
- SQLite user table managed through NuxtHub migrations.
- Pantry Panic domain tables for lists, items, recipes, list items, and meal planner data.
- User CRUD API routes under `/api/users`.
- Blob storage API routes under `/api/blobs`.
- Public safe raster image serving under `/images/**`.
- Build-time HTTP admin-user seed from `ADMIN_USER_EMAIL`, `ADMIN_USER_PASSWORD`, `ADMIN_API_KEY`, and `NUXT_PUBLIC_SITE_URL`.

Not implemented yet:

- Pantry Panic product UI.
- Authorization/permissions beyond coarse authentication.
- Grocery list, item, list-item, and recipe API endpoints.
- PWA behavior beyond installed dependencies/config groundwork.

## Product Direction

Pantry Panic should focus on fast shared grocery-list management:

- Long-lived reusable lists.
- Historical item data instead of destructive deletion.
- Item autocomplete and quick re-add flows.
- Recipes as reusable templates that create new list-item records.
- Mobile-first shopping workflows with minimal taps.

Future ideas in `PLAN.md`, such as barcode scanning, push notifications, price tracking, meal
planning, offline sync, and AI recommendations, are intentionally outside the MVP.

## Stack

- Nuxt 4
- Vue 3
- TypeScript
- Nuxt UI
- Tailwind CSS 4
- Pinia
- VueUse
- NuxtHub
- Drizzle ORM
- Zod v4
- Cloudflare D1, KV, and R2 in production

## Setup

Install dependencies:

```bash
pnpm install
```

Create a local `.env` with at least:

```bash
ADMIN_USER_EMAIL=<admin-email>
ADMIN_USER_PASSWORD=<admin-password>
ADMIN_API_KEY=<server-api-key>
NUXT_PUBLIC_SITE_URL=<instance-url>
NUXT_SESSION_PASSWORD=<at-least-32-characters>
```

Production blob/database/cache configuration also expects:

```bash
CLOUDFLARE_D1_DATABASE_ID=<database-id>
CLOUDFLARE_CACHE_NAMESPACE_ID=<namespace-id>
CLOUDFLARE_R2_BUCKET=<bucket-name>
```

## Development

Start the development server:

```bash
pnpm dev
```

Generate and apply database migrations:

```bash
pnpm db:generate
pnpm db:migrate
```

## Validation

Run the project checks:

```bash
pnpm lint
pnpm test:coverage
pnpm typecheck
```

Build for production:

```bash
pnpm build
```

The build runs a Nuxt `build:done` hook that seeds the initial admin user by calling
`NUXT_PUBLIC_SITE_URL/api/users` with `x-api-token: ADMIN_API_KEY`. This can target a local or
remote instance. If the configured email already exists, the seed is skipped. If the configured
instance is unreachable during build, the seed logs a warning and skips without failing the build.

Production deployment runs through `.github/workflows/deploy.yml`: it builds for Cloudflare,
applies D1 migrations with Wrangler, deploys the Worker, then runs the HTTP admin seed.

## API Snapshot

Auth routes:

- `POST /api/auth/login`
- `POST /api/auth/logout`

User routes:

- `GET /api/users` with optional `email`, `limit`, and `offset` query parameters
- `POST /api/users`
- `GET /api/users/:userId`
- `PUT /api/users/:userId`
- `PATCH /api/users/:userId`
- `DELETE /api/users/:userId`

Blob routes:

- `GET /api/blobs`
- `POST /api/blobs`
- `POST /api/blobs/validate`
- `GET /api/blobs/**`
- `PUT /api/blobs/**`
- `DELETE /api/blobs/**`
- `/api/blobs/multipart/:action/**`
- `GET /images/**`

API responses for users omit `password`. Server API and image routes require either a user session
or `x-api-token: ADMIN_API_KEY`, except `/api/auth/login` and `/api/_auth/session`. Fine-grained
authorization and permissions are deliberately deferred.

## Documentation

- Human docs: [docs/](./docs/README.md)
- Database docs: [docs/database/](./docs/database/README.md)
- Testing docs: [docs/testing/](./docs/testing/README.md)
- Agent docs: [.agents/](./.agents/README.md)
- Product plan: [PLAN.md](./PLAN.md)
