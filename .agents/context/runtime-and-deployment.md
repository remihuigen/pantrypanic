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

The app UI is still mostly the Nuxt UI starter template:

- `app/app.vue` contains the Pantry Panic app shell with session-aware header controls.
- `app/pages/index.vue` contains starter landing-page content.
- `app/pages/login.vue` contains the email/password sign-in form.
- `app/pages/logout.vue` clears the session and redirects to login.
- Pantry Panic grocery workflows are not implemented yet.

## Authentication

- `nuxt-auth-utils` provides the user session cookie and `useUserSession()`.
- `POST /api/auth/login` validates email/password credentials and sets a session.
- `POST /api/auth/logout` clears the session.
- `app/middleware/auth.global.ts` protects app routes except `/login` and `/logout`.
- `server/middleware/auth.ts` protects `/api/**` and `/images/**`, except `/api/auth/login` and `/api/_auth/session`.
- `server/utils/auth.ts` exposes `isAuthenticated(event)` and `requireAuthenticated(event)`.
- Server requests can authenticate with a session cookie or `x-api-token: ADMIN_API_KEY`.
- `ADMIN_API_TOKEN` remains accepted as a legacy fallback for existing local environments.

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
- `ADMIN_API_TOKEN` (legacy fallback)
- `NUXT_PUBLIC_SITE_URL`
- `NUXT_SESSION_PASSWORD`

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

The deployment workflow sets `SKIP_ADMIN_SEED=1` during build and runs `pnpm seed:admin` after
D1 migrations and Worker deployment complete.

## Deployment Workflow

`.github/workflows/deploy.yml` deploys production on pushes to `main`.

The workflow:

- builds with `NITRO_PRESET=cloudflare_module`
- disables admin seeding during build with `SKIP_ADMIN_SEED=1`
- applies remote D1 migrations with `wrangler d1 migrations apply DB --remote --config .output/server/wrangler.json`
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
- `pnpm typecheck`
- `pnpm db:generate`
- `pnpm db:migrate`
- `pnpm seed:admin`

`pnpm lint` and `pnpm typecheck` are the required baseline checks for meaningful changes.

`pnpm build` also exercises the admin seed hook.

## Known Local Runtime Note

In this environment, `pnpm dev` has previously exited with `EMFILE: too many open files, watch`.
Build and typecheck still complete successfully.
