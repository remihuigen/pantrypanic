# CI/CD

## Cloudflare Deployment

Deployments are handled by `.github/workflows/deploy.yml` instead of Cloudflare Workers Builds.
Workers Builds can deploy the Worker, but it does not apply Cloudflare D1 migrations.

The deployment workflow runs on pushes to `main` and from manual `workflow_dispatch`.

Order of operations:

1. Install dependencies with the shared GitHub setup action.
2. Build with `NITRO_PRESET=cloudflare_module` and `SKIP_ADMIN_SEED=1`.
3. Verify `.output/server/wrangler.json` exists.
4. Apply D1 migrations with Wrangler:

```bash
pnpm exec wrangler d1 migrations apply DB --remote --config .output/server/wrangler.json
```

5. Deploy the generated Worker:

```bash
pnpm exec wrangler --cwd .output deploy
```

6. Seed the initial admin user over HTTP:

```bash
pnpm seed:admin
```

## Migration Handling

`nuxt.config.ts` disables NuxtHub build-time migrations for production D1 builds with
`applyMigrationsDuringBuild: false`.

NuxtHub still includes the migration files and generated Wrangler metadata in the Cloudflare build.
Wrangler applies pending migrations against the remote D1 database before deployment.

## Required GitHub Environment Secrets

Configure these in the `production` GitHub Environment:

```bash
CLOUDFLARE_API_TOKEN=<cloudflare-api-token>
CLOUDFLARE_ACCOUNT_ID=<cloudflare-account-id>
CLOUDFLARE_DATABASE_ID=<d1-database-id>
CLOUDFLARE_CACHE_NAMESPACE_ID=<kv-cache-namespace-id>
CLOUDFLARE_R2_BUCKET=<r2-bucket-name>
NUXT_PUBLIC_SITE_URL=<deployed-site-url>
NUXT_SESSION_PASSWORD=<at-least-32-characters>
ADMIN_API_KEY=<server-api-key>
ADMIN_USER_EMAIL=<admin-email>
ADMIN_USER_PASSWORD=<admin-password>
```

The Cloudflare API token needs Workers deploy access plus D1, KV, and R2 permissions.

Runtime secrets such as `ADMIN_API_KEY` and `NUXT_SESSION_PASSWORD` must also exist in the
Cloudflare Worker environment, not only in GitHub Actions.
