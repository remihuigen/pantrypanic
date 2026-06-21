# CI/CD

## Manual staged deployment

Deployments use `.github/workflows/deploy.yml`, not Cloudflare Workers Builds, because the workflow
must apply D1 migrations before deploying the Worker.

The workflow is **manual only**. It does not deploy pushes to `main`. Run it from GitHub Actions and
select either `staging` or `production`. GitHub Environment protections control who can deploy to
production.

Always deploy a commit to staging first, validate it, then run the same commit against production.
The workflow summary records the commit, selected environment, Worker name, D1 identifier prefix,
and site URL.

## Cloudflare resource scaffold

The `infra` workspace creates or adopts the Cloudflare resources required by the Nuxt app before a
deployment:

```bash
export CLOUDFLARE_ACCOUNT_ID=<account-id>
export CLOUDFLARE_API_TOKEN=<token-with-d1-and-r2-write-permissions>

pnpm infra:scaffold -- --environment staging --jurisdiction eu
pnpm infra:scaffold -- --environment production --jurisdiction eu
```

Use `--dry-run` to identify missing resources without creating or writing anything. Jurisdiction is
unset by default, so Cloudflare chooses placement unless `--jurisdiction eu` or
`--jurisdiction fedramp` is supplied. An explicit jurisdiction is checked when an existing resource
reports one.

The command manages an exact D1 database and R2 bucket, and records the Worker name for each
environment. It writes `infra/.staging.env` or `infra/.production.env` with only the generated
resource identifiers; the files are ignored by Git and never contain the API token or application
secrets. The first environment-specific deployment uploads the Nuxt Worker code.

GitHub Environment and secret creation is intentionally manual for now. Copy the generated resource
values into the matching GitHub Environment before dispatching a deployment.

## Required GitHub Environment configuration

Create both `staging` and `production` GitHub Environments. Each must use distinct Cloudflare
Worker, D1, R2, and application-secret values.

Configure these **secrets** in each environment:

```text
CLOUDFLARE_API_TOKEN=<cloudflare-api-token>
CLOUDFLARE_ACCOUNT_ID=<cloudflare-account-id>
NUXT_SESSION_PASSWORD=<at-least-32-characters>
ADMIN_API_KEY=<server-api-key>
ADMIN_USER_EMAIL=<admin-email>
ADMIN_USER_PASSWORD=<admin-password>
TURNSTILE_SECRET_KEY=<turnstile-secret-key-if-enabled>
```

Configure these **variables** in each environment, using the generated `infra/.<environment>.env`
file as the source for the Cloudflare entries:

```text
CLOUDFLARE_WORKER_NAME=<worker-name>
CLOUDFLARE_D1_DATABASE_ID=<d1-database-id>
CLOUDFLARE_R2_BUCKET=<r2-bucket-name>
NUXT_PUBLIC_SITE_URL=<deployed-site-url>
ENABLE_MULTI_TENANCY=false
ENABLE_HOUSEHOLD_CREATION=false
ENABLE_PUBLIC_REGISTRATION=false
ENABLE_BETA_PERIOD=false
ENABLE_MARKETING=false
ENABLE_TURNSTILE=false
TURNSTILE_SITE_KEY=<turnstile-site-key-if-enabled>
```

The scaffold API token needs `D1 Write` and `Workers R2 Storage Write` access. The deployment
workflow token also needs `Workers Scripts Write`. Do not configure the obsolete
`CLOUDFLARE_CACHE_NAMESPACE_ID`: it is not a runtime binding.

## Deployment order

1. Install workspace dependencies with the shared GitHub setup action.
2. Run `pnpm test:coverage` from the workspace root.
3. Build `@pantrypanic/nuxt` with `SKIP_ADMIN_SEED=1` and selected environment variables.
4. Verify `apps/nuxt/.output/server/wrangler.json`.
5. Apply migrations to the selected D1 database:

```bash
pnpm --dir apps/nuxt exec wrangler d1 migrations apply DB --remote --config .output/server/wrangler.json
```

6. Set the session secret on the selected Worker and deploy the generated Worker:

```bash
pnpm --dir apps/nuxt exec wrangler --cwd .output deploy
```

7. Seed the selected environment's initial admin user over HTTP.

## Migration handling

`apps/nuxt/nuxt.config.ts` disables NuxtHub build-time migrations for production D1 builds with
`applyMigrationsDuringBuild: false`. Wrangler applies pending migrations to the selected remote
database before its Worker deployment.
