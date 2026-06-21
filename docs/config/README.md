# Config

## Workspace location

The Nuxt application lives in `apps/nuxt`. Its runtime configuration is `apps/nuxt/nuxt.config.ts`,
and local Nuxt environment files belong in `apps/nuxt/.env`. Root pnpm commands such as `pnpm dev`,
`pnpm build`, and `pnpm typecheck` delegate to that workspace.

## Authentication

Authentication is configured with `nuxt-auth-utils`.

Required environment variables:

```bash
ADMIN_USER_EMAIL=<admin-email>
ADMIN_USER_PASSWORD=<admin-password>
ADMIN_API_KEY=<server-api-key>
NUXT_PUBLIC_SITE_URL=<instance-url>
NUXT_PUBLIC_REFRESH_INTERVAL=5000
ENABLE_MULTI_TENANCY=false
ENABLE_HOUSEHOLD_CREATION=false
ENABLE_PUBLIC_REGISTRATION=false
NUXT_SESSION_PASSWORD=<at-least-32-characters>
```

- `ADMIN_USER_EMAIL` and `ADMIN_USER_PASSWORD` seed the initial user during the Nuxt `build:done`
  hook.
- `ADMIN_API_KEY` authenticates server requests that send `x-api-token`.
- `NUXT_PUBLIC_SITE_URL` is the instance base URL used by the HTTP seed script.
- `NUXT_PUBLIC_REFRESH_INTERVAL` is the frontend polling interval in milliseconds.
- `ENABLE_MULTI_TENANCY` enables user-selectable household context for users with multiple
  memberships. The default `false` treats the first household as the singleton app household.
- `ENABLE_HOUSEHOLD_CREATION` lets logged-in users create their first or an extra household when
  multi-tenancy is enabled.
- `ENABLE_PUBLIC_REGISTRATION` is reserved for future public account registration. Invite-link
  onboarding remains available because it is token-gated.
- Household mode flags are written to public runtime config for client UI affordances and private
  runtime config for API decisions. Server routes must read the private runtime config values.
- `NUXT_SESSION_PASSWORD` signs/encrypts session cookies. Development can auto-generate it, but
  production must set a stable value.
- Auth sessions expire after 30 days via `runtimeConfig.session.maxAge`.

## Turnstile

Turnstile is configured through `runtimeConfig.turnstile` and `runtimeConfig.public.turnstile` in
`apps/nuxt/nuxt.config.ts`.

Relevant environment variables:

```bash
ENABLE_TURNSTILE=false
TURNSTILE_SECRET_KEY=<secret-key>
TURNSTILE_SITE_KEY=<site-key>
```

- `ENABLE_TURNSTILE=true` enables both client-side token collection and server-side verification.
- `TURNSTILE_SECRET_KEY` is private server runtime config and is used by
  `server/utils/turnstile.ts`.
- `TURNSTILE_SITE_KEY` is exposed through public runtime config and consumed by
  `app/composables/useTurnstile.ts`.
- In local and test workflows, server validation is bypassed when Turnstile is enabled but no secret
  key is configured. Production requires a configured secret key.
- Invite-link acceptance currently uses Turnstile verification before a household join can be
  completed.

## Pantry Runtime Defaults

Editable Pantry defaults are declared in `runtimeConfig.pantry` in `apps/nuxt/nuxt.config.ts`.

These environment variables are read explicitly in `nuxt.config.ts` and mapped to the matching
runtime config properties:

```bash
NUXT_PANTRY_DEFAULT_LIST_NAME=Boodschappen
NUXT_PANTRY_DEFAULT_USER_LIST_LIMIT=50
NUXT_PANTRY_MAX_USER_LIST_LIMIT=100
NUXT_PANTRY_DEFAULT_ITEM_SEARCH_LIMIT=10
NUXT_PANTRY_MAX_ITEM_SEARCH_LIMIT=50
NUXT_PANTRY_DEFAULT_BLOB_LIST_LIMIT=100
NUXT_PANTRY_MAX_BLOB_LIST_LIMIT=1000
NUXT_PANTRY_MANAGED_BLOB_MAX_UPLOAD_SIZE=32MB
```

These values control seed data defaults, request-facing pagination/search defaults, blob listing
limits, and the managed blob upload size. Domain invariants, such as the seven meal-planner days and
status enum values, remain code/schema contracts rather than runtime configuration.

## Route Rendering

Product app pages live below `/app` and currently use Nuxt's normal SSR path:

```ts
routeRules: {
  '/app': { ssr: true },
  '/app/**': { ssr: true }
}
```

Keep `/login` and `/logout` outside these route rules so authentication pages remain
server-renderable. Future marketing routes should also stay outside `/app` and can opt into
prerendering with their own route rules.

When marketing is enabled, production builds prerender the marketing seed routes `/`, `/blog`, and
`/legal`, with Nitro link crawling enabled so linked blog/legal detail pages are emitted as static
HTML too.

The PWA service worker is registered with `scope: '/app/'`, so it only controls `/app/**` routes and
does not take over `/`, `/login`, `/logout`, or other public/auth pages. `nuxt.config.ts` still adds
`^\/app(?:\/.*)?$` to `pwa.workbox.navigateFallbackDenylist` so Cloudflare/Nitro remains the source
of truth for SSR app routes instead of Workbox serving the `/app` entry document for deep links.

The optional marketing layer lives under `layer/marketing` instead of `layers/marketing` so Nuxt
does not auto-discover it. `nuxt.config.ts` only extends that layer when `ENABLE_MARKETING=true`.
Because Nuxt's generated app/node/shared tsconfigs only auto-include `layers/*`, `nuxt.config.ts`
extends `typescript.tsConfig`, `typescript.nodeTsConfig`, and `typescript.sharedTsConfig` with
matching `layer/*` globs only when `ENABLE_MARKETING=true`. That keeps IDE type resolution and
`pnpm typecheck` coverage intact for the manual layer path without forcing marketing-only files into
non-marketing builds. `types/optional-nuxt-content.d.ts` provides a minimal local fallback for
`@nuxt/content` so `content.config.ts` can still typecheck when the content package is absent and
marketing is disabled. `$production.nitro.prerender` seeds `/`, `/blog`, and `/legal` and enables
`crawlLinks`, so all marketing-layer pages reachable from those indexes are prerendered in
production builds.

When the marketing layer is enabled, `layer/marketing/nuxt.config.ts` adds `@nuxt/content`.
`content.config.ts` defines the current Nuxt Content collections:

- `blog`: page collection sourced from `content/blog/*.md` with required `dateCreated` and
  `dateUpdated` frontmatter plus blog-specific metadata such as `shortTitle`, `tags`, and `authors`.
- `legal`: page collection sourced from `content/legal/*.md` with required `dateCreated` and
  `dateUpdated` frontmatter.
- `faqs`: data collection sourced from `content/faqs/**.yml` with `marketing` and `support`
  categories.

`nuxt.config.ts` also defines the local Vite alias `#shaders-vue` to
`node_modules/shaders/dist/vue`. Landing-page shader components import through that alias so Vite
can resolve the exact runtime modules that are used instead of walking the `shaders/vue` barrel.

## Database Migrations

Production D1 builds set `applyMigrationsDuringBuild: false` in `nuxt.config.ts`.

Migrations are applied by the GitHub deployment workflow before `wrangler deploy`.

## Blob Storage And Images

Blob storage is configured through NuxtHub in `nuxt.config.ts`.

- Development uses the filesystem driver at `.data/blob`.
- Production uses Cloudflare R2 through the `BLOB` binding and `CLOUDFLARE_R2_BUCKET`.
- Nuxt Image uses `provider: 'none'` outside production so `/images/**` blob routes work locally.
- Production switches Nuxt Image to the Cloudflare provider, which can optimize `/images/**` URLs on
  Cloudflare.

Expected production environment:

```bash
CLOUDFLARE_R2_BUCKET=<bucket-name>
```
