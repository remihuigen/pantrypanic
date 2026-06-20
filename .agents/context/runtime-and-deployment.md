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
- Nuxt Content
- nuxt-auth-utils
- nuxt-authorization

## Frontend State

The product app UI is namespaced under `/app`:

- `app/pages/app/**` contains product routes such as `/app/lists`, `/app/lists/:id`, `/app/recipes`,
  `/app/recipes/:id`, `/app/meal-planner`, `/app/settings`, `/app/settings/household`,
  `/app/settings/item-vault`, `/app/settings/categories`, and `/app/settings/stats`.
- `nuxt.config.ts` sets `routeRules` with `ssr: true` for `/app` and `/app/**`, so product app
  routes render through Nuxt's normal SSR path.
- `nuxt.config.ts` sets `pwa.scope = '/app/'`, so the generated service worker only controls
  `/app/**` and stays off `/`, `/login`, `/logout`, and other public/auth routes.
- `nuxt.config.ts` also denies Workbox navigation fallback for `/app/**`, so installed PWAs keep
  routing deep links through Cloudflare/Nitro SSR instead of serving the `/app` entry document.
- `app/layouts/app.vue` only surfaces the service-worker update toast.
- `app/pages/download.vue` owns the manual install flow through a `UPageHero` action and
  `UStepper` guidance, while `app/composables/usePwaInstallPrompt.ts` only exposes standalone
  detection plus an explicit `installApp()` action for that page.
- `app/plugins/data-hydration.client.ts` only boots authenticated store hydration and the refresh
  scheduler when the current route lives under `/app`, so public landing/auth routes do not fetch
  product-app profile or household state during client startup.
- The optional marketing layer is stored at `layer/marketing`, not `layers/marketing`, so Nuxt
  does not auto-discover it. `nuxt.config.ts` only adds it to `extends` when
  `ENABLE_MARKETING=true`.
- Because Nuxt's generated app/node/shared tsconfigs only include `layers/*`, `nuxt.config.ts`
  extends `typescript.tsConfig`, `typescript.nodeTsConfig`, and `typescript.sharedTsConfig` with
  matching `layer/*` globs only when marketing is enabled. Keep those globs in sync if the manual
  layer path changes.
- `types/optional-nuxt-content.d.ts` provides a minimal fallback declaration for `@nuxt/content`
  so `content.config.ts` can still typecheck when marketing is disabled and the package is absent.
- `nuxt.config.ts` defines `#shaders-vue` as a Vite alias to `node_modules/shaders/dist/vue` so the
  landing-page shader imports resolve to direct runtime modules instead of the package barrel.
- `/` serves the public landing page. `/download` serves the public PWA install page. `/app`
  redirects to `/app/lists`.
- `app/pages/(auth)/login.vue` contains the email/password sign-in form at `/login`.
- `app/pages/(auth)/logout.vue` clears the session and redirects to login at `/logout`.
- Auth and future public/marketing pages remain outside `/app`; add explicit prerender route rules
  for marketing pages when they are introduced.
- `app/composables/useTurnstile.ts` owns client-side Turnstile token state, retry, reset, and
  error-toast handling for protected onboarding/auth flows.
- Recipe overview favorites are local browser state keyed per user profile. They are incremented
  when a recipe is copied to a list and are not synchronized through the backend.

## Authentication

- `nuxt-auth-utils` provides the user session cookie and `useUserSession()`.
- `POST /api/auth/login` validates email/password credentials and sets a session.
- `POST /api/auth/logout` clears the session.
- Sessions expire after 30 days through `runtimeConfig.session.maxAge`.
- User sessions can include `activeHouseholdId`; domain APIs resolve household scope from this
  session value.
- Invite/reset access-link acceptance routes are public and token-gated.
- `app/middleware/01.auth.global.ts` protects `/app` routes and redirects unauthenticated visits to
  `/login?redirect=<target>`. Non-`/app` routes are public unless they add their own guard.
- `server/middleware/auth.ts` protects `/api/**` and `/images/**`, except `/api/auth/login` and
  `/api/_auth/session`.
- `server/utils/auth.ts` exposes `isAuthenticated(event)` and `requireAuthenticated(event)`.
- Server requests can authenticate with a session cookie or `x-api-token: ADMIN_API_KEY`.

## NuxtHub Configuration

Configured in `nuxt.config.ts`:

- database: SQLite locally, D1 driver outside development
- blob: filesystem driver at `.data/blob` locally, Cloudflare R2 in production

Production environment variables currently referenced:

- `CLOUDFLARE_D1_DATABASE_ID`
- `CLOUDFLARE_R2_BUCKET`
- `ADMIN_USER_EMAIL`
- `ADMIN_USER_PASSWORD`
- `ADMIN_API_KEY`
- `NUXT_PUBLIC_SITE_URL`
- `NUXT_PUBLIC_REFRESH_INTERVAL`
- `ENABLE_MULTI_TENANCY` (default `false`)
- `ENABLE_HOUSEHOLD_CREATION` (default `false`, lets logged-in users create households when
  multi-tenancy is enabled)
- `ENABLE_PUBLIC_REGISTRATION` (default `false`, reserved for future public account registration)
- `ENABLE_MARKETING` (default `false`, opt-in for the manual marketing layer/module/content setup)
- `ENABLE_TURNSTILE` (default `false`)
- Household mode flags are available in public runtime config for client UI and private runtime
  config for API logic. Server routes must read the private runtime config values.
- `NUXT_SESSION_PASSWORD`
- `TURNSTILE_SECRET_KEY`
- `TURNSTILE_SITE_KEY`
- optional `NUXT_PANTRY_*` values that are explicitly mapped to `runtimeConfig.pantry` in
  `nuxt.config.ts`

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
- R2/blob: `BLOB`

## Nuxt Image And Blob Serving

- Development uses `image.provider = 'none'` so `/images/**` blob URLs work directly.
- `$production` switches Nuxt Image to the Cloudflare provider.
- `GET /images/**` serves blob-backed raster images only.
- SVG is intentionally not served from `/images/**`.

## Marketing Content

- `ENABLE_MARKETING=true` opt-ins the manual `layer/marketing` layer through `nuxt.config.ts`.
- `layer/marketing/nuxt.config.ts` adds `@nuxt/content` only when that layer is active.
- `content.config.ts` currently declares `blog` and `legal` page collections plus the `faqs` data
  collection.
- `/blog/**` and `/legal/**` share the same editorial list/detail components in the marketing
  layer; the route entries only choose the section config and breadcrumb icon.
- `modules/marketing/index.ts` adds a global route middleware when marketing is disabled so `/`
  plus `/blog/**` and `/legal/**` redirect to `/login`.

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
- `DELETE /api/users/:userId`: delete a user through the shared account deletion flow.

User logic lives in `server/utils/user-management.ts`.

Current limitations:

- existing legacy plain-text passwords are rehashed after a successful login
- user API responses omit `password`
- user deletion follows the same household ownership, last-member, and orphaned-account cleanup
  rules as `DELETE /api/profile`

## Pantry Panic Domain API Routes

Pantry Panic domain routes are implemented under `server/api` with domain-folder route files and
shared helper logic in `server/utils/api-core.ts` and `server/domains.ts` (re-exporting
`server/utils/domains/*` concern modules).

Implemented route families:

- `GET /api/me`
- `/api/lists` for list CRUD, reorder, archive, soft-delete, clear, checked-item clear, list-item
  create, and flat or category-grouped list-item reorder
- `/api/list-items` for list-item list/category/name/metadata update, check, uncheck, and
  soft-delete
- `/api/items` for canonical item search and historical suggestions
- `/api/recipes` for recipe CRUD, archive, soft-delete, ingredients, reorder, and copy-to-list
- `/api/recipe-items` for recipe-item update and hard-delete
- `/api/meal-planner` for singleton seven-day planner reads, day updates, placeholder ingredients,
  clear, and copy-to-list
- `/api/households` for memberships, household creation, active household switching, members,
  household settings, invite links, and reset-access links
- `/api/profile` for profile edits and avatar upload
- `/api/settings` for canonical item/category maintenance, clear-data, and usage stats

Frontend interval refresh is centralized in `app/composables/useStoreRefresh.ts`. The client
plugin only starts the scheduler after the active route enters `/app` and session plus household
membership context are available. The scheduler calls `orchestrateRefresh()` and dispatches by
current `/app/**` route namespace: list overview, list detail with items, recipe overview/detail,
meal planner, or the active settings subroute. Route pages remain responsible for their own entry
fetches.

New domain routes use the shared response envelope:

- success: `{ success: true, data }`
- error: `{ success: false, error: { code, message, details? } }`

Zod validates params, query strings, and bodies. Validation messages are Dutch. All household
management actions are guarded by Nuxt Authorization abilities. Owner-gated server handlers should
call `getHouseholdContext(event, { authorize: ability })` so household resolution, membership-role
lookup, and server `authorize()` stay centralized in `server/utils/domains/households.ts`.
`householdOwner` members can invite users, generate reset links, remove members, promote members to
owner, update household settings, clear household app data, and destroy households. Regular members
keep access to the core domain flows. Users with no household membership get a friendly Dutch
empty-state message from the global app layout instead of a broken app state. That state offers
account deletion and, when `ENABLE_HOUSEHOLD_CREATION=true`, creating a new household. In
single-household mode, household destruction, deleting the last household-owner account, and
deleting the only remaining account before membership hydration are rejected server-side.

## Admin User Seed

`nuxt.config.ts` registers a `build:done` hook that calls `scripts/seed-admin-user.mjs`.

The seed:

- reads `ADMIN_USER_EMAIL` and `ADMIN_USER_PASSWORD`
- reads `ADMIN_API_KEY` and `NUXT_PUBLIC_SITE_URL`
- normalizes the email to lowercase
- calls `GET /api/users?email=<email>&limit=1` on `NUXT_PUBLIC_SITE_URL`
- calls `POST /api/users` only when missing
- authenticates both HTTP requests with `x-api-token: ADMIN_API_KEY`
- skips the legacy admin seed when both `ENABLE_MULTI_TENANCY=true` and
  `ENABLE_PUBLIC_REGISTRATION=true`
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

`pnpm test:coverage` runs Vitest against source-mirrored tests under `tests/unit/**`. Coverage
includes `app/**/*.{ts,js,mjs}`, `server/utils/**/*.{ts,js,mjs}`, `scripts/**/*.mjs`,
`content.config.ts`, `modules/**/*.{ts,js,mjs}`, and `layer/**/*.{ts,js,mjs}`. Coverage
thresholds are 90% for statements, lines, and functions, and 80% for branches. Vue single-file
components are intentionally excluded from this coverage scope.

`pnpm lint`, `pnpm test:coverage`, and `pnpm typecheck` are the required baseline checks for
meaningful changes.

`pnpm build` also exercises the admin seed hook.

## Known Local Runtime Note

In this environment, `pnpm dev` has previously exited with `EMFILE: too many open files, watch`.
Build and typecheck still complete successfully.
