# Runtime And Deployment (Agent)

## Nuxt Runtime

- Nuxt 4.4.6
- Vue 3
- Nuxt UI 4
- Nitro server
- TypeScript
- Tailwind CSS 4
- Pinia
- VueUse
- NuxtHub
- Nuxt Image
- nuxt-auth-utils

There is no Docus/content layer in the current checkout.

## Frontend State

The product app UI is namespaced under `/app`:

- `app/pages/app/**` contains product routes such as `/app/lists`, `/app/lists/:id`,
  `/app/recipes`, `/app/recipes/:id`, `/app/meal-planner`, and `/app/settings`.
- `nuxt.config.ts` sets `routeRules` with `ssr: false` for `/app` and `/app/**`, so product app
  routes render client-side only.
- `/` and `/app` redirect to `/app/lists`.
- `app/pages/(auth)/login.vue` contains the email/password sign-in form at `/login`.
- `app/pages/(auth)/logout.vue` clears the session and redirects to login at `/logout`.
- Auth and future public/marketing pages remain outside `/app`; add explicit prerender route rules
  for marketing pages when they are introduced.

## Authentication

- `nuxt-auth-utils` provides the user session cookie and `useUserSession()`.
- `POST /api/auth/login` validates email/password credentials and sets a session.
- `POST /api/auth/logout` clears the session.
- `app/middleware/01.auth.global.ts` protects `/app` routes and redirects unauthenticated visits to
  `/login?redirect=<target>`. Non-`/app` routes are public unless they add their own guard.
- `server/middleware/auth.ts` protects `/api/**` and `/images/**`, except `/api/auth/login` and
  `/api/_auth/session`.
- `server/utils/auth.ts` exposes `isAuthenticated(event)` and `requireAuthenticated(event)`.
- Server requests can authenticate with a session cookie or `x-api-token: ADMIN_API_KEY`.

## NuxtHub Configuration

Configured in `nuxt.config.ts`:

- database: SQLite locally, D1 driver outside development
- cache: Cloudflare KV binding outside development
- blob: filesystem driver at `.data/blob` locally, Cloudflare R2 in production

Production environment variables currently referenced:

- `CLOUDFLARE_D1_DATABASE_ID`
- `CLOUDFLARE_CACHE_NAMESPACE_ID`
- `CLOUDFLARE_R2_BUCKET`
- `ADMIN_USER_EMAIL`
- `ADMIN_USER_PASSWORD`
- `ADMIN_API_KEY`
- `NUXT_PUBLIC_SITE_URL`
- `NUXT_PUBLIC_REFRESH_INTERVAL`
- `NUXT_SESSION_PASSWORD`
- optional `NUXT_PANTRY_*` overrides for `runtimeConfig.pantry`

Runtime-configured Pantry defaults:

- `NUXT_PANTRY_DEFAULT_LIST_NAME` controls the seeded list name.
- `NUXT_PANTRY_DEFAULT_USER_LIST_LIMIT` and `NUXT_PANTRY_MAX_USER_LIST_LIMIT` control user-list
  pagination.
- `NUXT_PANTRY_DEFAULT_ITEM_SEARCH_LIMIT` and `NUXT_PANTRY_MAX_ITEM_SEARCH_LIMIT` control item
  search/suggestions.
- `NUXT_PANTRY_DEFAULT_BLOB_LIST_LIMIT` and `NUXT_PANTRY_MAX_BLOB_LIST_LIMIT` control blob metadata
  listing.
- `NUXT_PANTRY_MANAGED_BLOB_MAX_UPLOAD_SIZE` controls managed blob upload validation.

Expected production bindings:

- D1: `DB`
- KV/cache: `CACHE`
- R2/blob: `BLOB`

## Nuxt Image And Blob Serving

- Development uses `image.provider = 'none'` so `/images/**` blob URLs work directly.
- `$production` switches Nuxt Image to the Cloudflare provider.
- `GET /images/**` serves blob-backed raster images only.
- SVG is intentionally not served from `/images/**`.

## Blob API Routes

API route files are organized by domain and route segment. Segment roots use `index.<method>.ts`,
for example `server/api/blobs/index.get.ts` for `GET /api/blobs`.

Implemented routes:

- `GET /api/blobs`: list blob metadata.
- `POST /api/blobs`: upload multipart form files.
- `POST /api/blobs/validate`: validate multipart form files without storing.
- `GET /api/blobs/**`: read blob metadata.
- `PUT /api/blobs/**`: write raw request body to an exact blob pathname.
- `DELETE /api/blobs/**`: delete a blob.
- `/api/blobs/multipart/:action/**`: delegate multipart upload actions to NuxtHub.
- `GET /images/**`: serve safe raster image blobs.

Validation lives in `server/utils/blob-storage.ts`.

## User API Routes

User route files follow the domain-folder convention, for example `server/api/users/index.get.ts`
for `GET /api/users` and `server/api/users/[userId]/index.get.ts` for `GET /api/users/:userId`.

Implemented routes:

- `GET /api/users`: list users with optional `email`, `limit`, and `offset`.
- `POST /api/users`: create a user from `name`, `email`, and `password`.
- `GET /api/users/:userId`: read a user.
- `PUT /api/users/:userId`: update one or more user fields.
- `PATCH /api/users/:userId`: update one or more user fields.
- `DELETE /api/users/:userId`: delete a user.

User logic lives in `server/utils/user-management.ts`.

Current limitations:

- no fine-grained permission checks
- existing legacy plain-text passwords are rehashed after a successful login
- user API responses omit `password`

## Pantry Panic Domain API Routes

Pantry Panic domain routes are implemented under `server/api` with domain-folder route files and
shared helper logic in `server/utils/api-core.ts` and `server/domains.ts` (re-exporting
`server/utils/domains/*` concern modules).

Implemented route families:

- `GET /api/me`
- `/api/lists` for list CRUD, reorder, archive, soft-delete, clear, checked-item clear, list-item
  create, and list-item reorder
- `/api/list-items` for list-item list/name/metadata update, check, uncheck, and soft-delete
- `/api/items` for canonical item search and historical suggestions
- `/api/recipes` for recipe CRUD, archive, soft-delete, ingredients, reorder, and copy-to-list
- `/api/recipe-items` for recipe-item update and hard-delete
- `/api/meal-planner` for singleton seven-day planner reads, day updates, placeholder ingredients,
  clear, and copy-to-list

New domain routes use the shared response envelope:

- success: `{ success: true, data }`
- error: `{ success: false, error: { code, message, details? } }`

Zod validates params, query strings, and bodies. Validation messages are Dutch. Current
authorization is coarse authentication only; fine-grained permissions are still deferred.

Short-lived read caching is enabled for expensive or commonly polled domain GET routes:

- `GET /api/lists`
- `GET /api/lists/:listId`
- `GET /api/items/search`
- `GET /api/items/suggestions`
- `GET /api/recipes`
- `GET /api/recipes/:recipeId`
- `GET /api/meal-planner`

The cache helper is `defineCachedApiHandler()` in `server/utils/api-core.ts`. It wraps Nitro's
`defineCachedEventHandler`, leaving request URL and query-param cache keys to Nitro. SWR is disabled
for domain API reads, and runtime intervals under one second bypass caching. Cached API data must
not be served after `runtimeConfig.public.refreshInterval` (`NUXT_PUBLIC_REFRESH_INTERVAL`,
milliseconds).

## Admin User Seed

`nuxt.config.ts` registers a `build:done` hook that calls `scripts/seed-admin-user.mjs`.

The seed:

- reads `ADMIN_USER_EMAIL` and `ADMIN_USER_PASSWORD`
- reads `ADMIN_API_KEY` and `NUXT_PUBLIC_SITE_URL`
- normalizes the email to lowercase
- calls `GET /api/users?email=<email>&limit=1` on `NUXT_PUBLIC_SITE_URL`
- calls `POST /api/users` only when missing
- authenticates both HTTP requests with `x-api-token: ADMIN_API_KEY`
- logs a warning and skips when the configured instance is unreachable during build
- can be run directly with `pnpm seed:admin`

The deployment workflow sets `SKIP_ADMIN_SEED=1` during build and runs `pnpm seed:admin` after D1
migrations and Worker deployment complete.

## Deployment Workflow

`.github/workflows/deploy.yml` deploys production on pushes to `main`.

The workflow:

- builds with `NITRO_PRESET=cloudflare_module`
- disables admin seeding during build with `SKIP_ADMIN_SEED=1`
- applies remote D1 migrations with
  `wrangler d1 migrations apply DB --remote --config .output/server/wrangler.json`
- deploys the generated Worker with `wrangler --cwd .output deploy`
- runs the HTTP admin seed after deploy

Production D1 builds use `applyMigrationsDuringBuild: false`; migrations are handled by CI before
deployment.

## Build And Validation

Package scripts:

- `pnpm dev`
- `pnpm build`
- `pnpm preview`
- `pnpm lint`
- `pnpm test`
- `pnpm test:run`
- `pnpm test:coverage`
- `pnpm typecheck`
- `pnpm db:generate`
- `pnpm db:migrate`
- `pnpm seed:admin`

`pnpm test:coverage` runs Vitest against TypeScript/JavaScript logic in `server/utils/**/*` and
`scripts/**/*.mjs`. Coverage thresholds are 90% for statements, lines, and functions, and 80% for
branches. Vue single-file components are intentionally excluded from coverage.

`pnpm lint`, `pnpm test:coverage`, and `pnpm typecheck` are the required baseline checks for
meaningful changes.

`pnpm build` also exercises the admin seed hook.

## Known Local Runtime Note

In this environment, `pnpm dev` has previously exited with `EMFILE: too many open files, watch`.
Build and typecheck still complete successfully.
