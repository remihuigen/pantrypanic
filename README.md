# Pantry Panic

Pantry Panic is a publicly available, easy-to-host grocery list manager for your household.

## Why _another_ list manager app?

The answer is quite simple: to make my wife stop complaining about whatever list app she is using at
the moment. List management apps tend to go one of two ways: either they are overengineered family
planner apps, or they are simple checkbox apps (with horrendous UX) that lack the smart features
that make grocery planning not suck. Pantry Panic tries to hit the sweet spot in between: we don't
overindulge in complexity, but the app is smart enough to prevent repetitiveness.

Oh yeah—and did I mention it's **free and self-hostable**? All you need is a (free) Cloudflare
account.

## Deploy Pantry Panic

To deploy your own Pantry Panic instance to Cloudflare, follow the steps below. For details on local
development, see the [Development](#development) section.

0. If you don't have a Cloudflare account, [create one](https://dash.cloudflare.com/sign-up). The
   free tier should be more than enough for small households.
1. Create the required resources in the Cloudflare dashboard:
   - [ ] Create a D1 database, and write down the `database UUID` somewhere. If you are located in
         the EU, it's sensible to opt in to EU jurisdiction.
   - [ ] Create a new bucket in R2 Object Storage, and write down the `bucket name` somewhere.
         Again, if you are located in the EU, it's sensible to opt in to EU jurisdiction.
   - [ ] Create a new Workers KV instance, and write down the `namespace ID` somewhere.
2. In the Cloudflare dashboard, navigate to your Account API Tokens and create a new token with
   `read and write` permissions for Worker-related resources. Make sure to write down the API token
   and secrets somewhere, as they will not be shown again.
3. Write down your Cloudflare Account ID. You can find it in the dashboard URL:
   `https://dash.cloudflare.com/<account-id>`
4. Fork this repository.
5. Generate a _hashing secret_ and _admin API key_ with `openssl rand -hex 32`.
6. In your GitHub repository, go to Settings and add these secrets and variables under `Actions`.

```text
# Repository variables
CLOUDFLARE_WORKER_NAME=<worker-name> # Defaults to `pantrypanic`

# Repository secrets
CLOUDFLARE_DATABASE_ID=<database-id>
CLOUDFLARE_CACHE_NAMESPACE_ID=<namespace-id>
CLOUDFLARE_R2_BUCKET=<bucket-name>
CLOUDFLARE_API_TOKEN=<api-token>
CLOUDFLARE_ACCOUNT_ID=<account-id>

NUXT_PUBLIC_SITE_URL=<instance-url> # Will become available after the initial deployment
NUXT_SESSION_PASSWORD=<hashing-secret>
ADMIN_API_KEY=<admin-api-key>

ADMIN_USER_EMAIL=<initial-user-email>
ADMIN_USER_PASSWORD=<initial-user-password>
```

7. Navigate to GitHub Actions and manually dispatch the Deploy Action. A new Cloudflare Worker will
   be provisioned with the resource bindings attached.
8. Once deployment is finished: A) Using a custom domain? Follow the Cloudflare documentation to
   [configure your custom domain DNS](https://developers.cloudflare.com/dns/). Then navigate to your
   newly created Worker and attach the custom domain. B) Otherwise, find the `workers.dev` URL in
   the Cloudflare dashboard or in the GitHub Actions deployment logs.
9. Navigate back to GitHub Actions secrets and update `NUXT_PUBLIC_SITE_URL`.
10. Trigger a manual redeployment.

Now you can navigate to the `workers.dev` URL or your custom domain to access your Pantry Panic
instance and log in with the user credentials you provided in step 6.

### Deploying the latest version of Pantry Panic

At this moment, Pantry Panic does not have official releases. To deploy the latest version of the
project, simply sync your fork. If new commits are detected, your Worker will automatically
redeploy.

## Current State

Implemented:

- Nuxt 4 app with Nuxt UI, Pinia, VueUse, Nuxt Image, NuxtHub, nuxt-auth-utils, Drizzle, and Zod.
- Email/password login, logout, and session management.
- Server-route authentication guard using sessions or `x-api-token`.
- SQLite user table managed through NuxtHub migrations.
- Pantry Panic domain tables for lists, items, recipes, list items, and meal planner data.
- User CRUD API routes under `/api/users`.
- Blob storage API routes under `/api/blobs`.
- Pantry Panic domain API routes for lists, list items, items, recipes, recipe items, and meal
  planner workflows.
- Public safe raster image serving under `/images/**`.
- Build-time HTTP admin-user seed from `ADMIN_USER_EMAIL`, `ADMIN_USER_PASSWORD`, `ADMIN_API_KEY`,
  and `NUXT_PUBLIC_SITE_URL`.

Not implemented yet:

- Pantry Panic product UI.
- Authorization/permissions beyond coarse authentication.
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
NUXT_PUBLIC_REFRESH_INTERVAL=5000
NUXT_SESSION_PASSWORD=<at-least-32-characters>
```

Runtime-tunable Pantry defaults live in `runtimeConfig.pantry` and can be overridden with matching
Nuxt environment variables, for example:

```bash
NUXT_PANTRY_DEFAULT_LIST_NAME=Boodschappen
NUXT_PANTRY_DEFAULT_ITEM_SEARCH_LIMIT=10
NUXT_PANTRY_MANAGED_BLOB_MAX_UPLOAD_SIZE=32MB
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

Production deployment runs through `.github/workflows/deploy.yml`: it builds for Cloudflare, applies
D1 migrations with Wrangler, deploys the Worker, then runs the HTTP admin seed.

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

Domain routes:

- `GET /api/me`
- `GET /api/lists`, `POST /api/lists`, `POST /api/lists/reorder`
- `GET /api/lists/:listId`, `PATCH /api/lists/:listId`
- `POST /api/lists/:listId/archive`, `/delete`, `/clear`
- `POST /api/lists/:listId/items`, `POST /api/lists/:listId/items/reorder`
- `PATCH /api/list-items/:listItemId`
- `POST /api/list-items/:listItemId/check`, `/uncheck`, `/delete`
- `GET /api/items/search`, `GET /api/items/suggestions`
- `GET /api/recipes`, `POST /api/recipes`
- `GET /api/recipes/:recipeId`, `PATCH /api/recipes/:recipeId`
- `POST /api/recipes/:recipeId/archive`, `/delete`, `/items`, `/items/reorder`, `/add-to-list`
- `PATCH /api/recipe-items/:recipeItemId`, `POST /api/recipe-items/:recipeItemId/delete`
- `GET /api/meal-planner`, `POST /api/meal-planner/clear`, `POST /api/meal-planner/add-to-list`
- `PATCH /api/meal-planner/days/:dayOfWeek`
- `POST /api/meal-planner/days/:dayOfWeek/items`, `/items/reorder`
- `PATCH /api/meal-planner/day-items/:mealPlannerDayItemId`
- `POST /api/meal-planner/day-items/:mealPlannerDayItemId/delete`

New Pantry Panic domain endpoints return `{ success: true, data }` on success and
`{ success: false, error }` on errors. API responses for users omit `password`. Server API and image
routes require either a user session or `x-api-token: ADMIN_API_KEY`, except `/api/auth/login` and
`/api/_auth/session`. Fine-grained authorization and permissions are deliberately deferred.

Short-lived API caching is enabled for expensive/polled domain reads: lists, list detail, item
search/suggestions, recipes, recipe detail, and meal planner. These routes use Nitro cached event
handlers, which include query params in cache keys. SWR is disabled, and cache age is capped by
`runtimeConfig.public.refreshInterval`, configured with `NUXT_PUBLIC_REFRESH_INTERVAL` in
milliseconds. Intervals under one second bypass the cache.

## Documentation

- Human docs: [docs/](./docs/README.md)
- Database docs: [docs/database/](./docs/database/README.md)
- Testing docs: [docs/testing/](./docs/testing/README.md)
- Agent docs: [.agents/](./.agents/README.md)
- Product plan: [PLAN.md](./PLAN.md)
