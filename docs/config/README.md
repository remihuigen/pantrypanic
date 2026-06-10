# Config

## Authentication

Authentication is configured with `nuxt-auth-utils`.

Required environment variables:

```bash
ADMIN_USER_EMAIL=<admin-email>
ADMIN_USER_PASSWORD=<admin-password>
ADMIN_API_KEY=<server-api-key>
NUXT_PUBLIC_SITE_URL=<instance-url>
NUXT_PUBLIC_REFRESH_INTERVAL=5000
NUXT_SESSION_PASSWORD=<at-least-32-characters>
```

- `ADMIN_USER_EMAIL` and `ADMIN_USER_PASSWORD` seed the initial user during the Nuxt `build:done` hook.
- `ADMIN_API_KEY` authenticates server requests that send `x-api-token`.
- `NUXT_PUBLIC_SITE_URL` is the instance base URL used by the HTTP seed script.
- `NUXT_PUBLIC_REFRESH_INTERVAL` is the frontend polling interval in milliseconds. Short-lived API
  caches must not outlive this value.
- `NUXT_SESSION_PASSWORD` signs/encrypts session cookies. Development can auto-generate it, but production must set a stable value.

## Pantry Runtime Defaults

Editable Pantry defaults are declared in `runtimeConfig.pantry` in `nuxt.config.ts`.

They can be overridden at runtime with Nuxt's matching environment variable names:

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
limits, and the managed blob upload size. Domain invariants, such as the seven meal-planner days
and status enum values, remain code/schema contracts rather than runtime configuration.

## Database Migrations

Production D1 builds set `applyMigrationsDuringBuild: false` in `nuxt.config.ts`.

Migrations are applied by the GitHub deployment workflow before `wrangler deploy`.

## Blob Storage And Images

Blob storage is configured through NuxtHub in `nuxt.config.ts`.

- Development uses the filesystem driver at `.data/blob`.
- Production uses Cloudflare R2 through the `BLOB` binding and `CLOUDFLARE_R2_BUCKET`.
- Nuxt Image uses `provider: 'none'` outside production so `/images/**` blob routes work locally.
- Production switches Nuxt Image to the Cloudflare provider, which can optimize `/images/**` URLs on Cloudflare.

Expected production environment:

```bash
CLOUDFLARE_R2_BUCKET=<bucket-name>
```
