# Infrastructure scaffold

This workspace provisions the Cloudflare storage resources that Pantry Panic needs before a manual
deployment. It is deliberately small: it creates or adopts the named D1 database and R2 bucket for
an environment, then records their identifiers for the GitHub deployment workflow.

The Worker is not created here. A Worker script is an application-code upload, so the first
source-controlled deployment creates it using the generated Worker name. The scaffold never uploads
placeholder code, deploys a Worker, applies migrations, configures domains, or creates GitHub
Environments/secrets.

## Run it

From the repository root, provide only a Cloudflare account ID and an API token:

```bash
export CLOUDFLARE_ACCOUNT_ID=<account-id>
export CLOUDFLARE_API_TOKEN=<api-token>

pnpm infra:scaffold -- --environment staging
pnpm infra:scaffold -- --environment production
```

The scaffold token needs `D1 Write` and `Workers R2 Storage Write` permissions for the target
account. The deployment workflow needs separate `Workers Scripts Write` permission to upload the
application Worker.

### Options

```text
--environment staging|production  Required. Selects the approved resource names.
--dry-run                          Reports missing D1/R2 resources without changing Cloudflare or files.
--jurisdiction eu|fedramp         Optional. Restricts newly created D1 and R2 resources.
```

Jurisdiction is intentionally unset by default. Without the flag, the D1 request has no
`jurisdiction` field and the R2 request has no `cf-r2-jurisdiction` header, leaving placement to
Cloudflare. Pass it explicitly when the environment requires a restriction:

```bash
pnpm infra:scaffold -- --environment staging --jurisdiction eu
```

When a requested jurisdiction is returned for an existing resource, it must match the requested
value or the command fails. Omitting the flag does not impose a jurisdiction check on resources that
already exist.

## Managed names

Resource names are fixed in [`constants.ts`](./constants.ts) so rerunning the command adopts the
same resources rather than creating similarly named replacements.

| Environment  | D1 database           | R2 bucket             | Worker name recorded for deploy |
| ------------ | --------------------- | --------------------- | ------------------------------- |
| `staging`    | `pantrypanic-staging` | `pantrypanic-staging` | `pantrypanic-staging`           |
| `production` | `pantrypanic`         | `pantrypanic`         | `pantrypanic`                   |

If production already uses different resource names, update the approved constants before the first
run. Do not use the scaffold to create a replacement production database or bucket.

## How it works

1. Validates CLI input and the two required environment variables with Zod.
2. Reads the target generated environment file, if present, and rejects a mismatched account,
   environment, Worker name, or R2 bucket name.
3. Lists D1 databases and finds the exact approved name; it creates the database only when absent.
4. Gets the exact R2 bucket; a `404` means it creates the bucket, while other Cloudflare failures
   stop the run.
5. On a non-dry run, writes the generated file only after both resources are confirmed. The write
   uses a temporary file followed by an atomic rename and sets file permissions to `0600`.

The D1 list request supports Cloudflare pagination. A repeat run does not create duplicate D1 or R2
resources. If a prior run created one resource and failed before writing the file, rerunning safely
adopts that resource and continues.

## Generated files

Successful runs create one ignored file:

```dotenv
# infra/.staging.env example
CLOUDFLARE_ACCOUNT_ID=<account-id>
CLOUDFLARE_WORKER_NAME=pantrypanic-staging
CLOUDFLARE_D1_DATABASE_ID=<d1-uuid>
CLOUDFLARE_R2_BUCKET=pantrypanic-staging
CLOUDFLARE_ENV=staging
```

The file contains resource identifiers only. It never contains `CLOUDFLARE_API_TOKEN`, application
secrets, Turnstile credentials, or GitHub credentials. Copy its Cloudflare values into the matching
GitHub Environment variables as described in [`../docs/ci-cd/README.md`](../docs/ci-cd/README.md).

## What this workspace does not manage

- Worker deployment, D1 migrations, application secrets, routes, domains, or DNS.
- GitHub Environments, GitHub secrets, or GitHub variables.
- Turnstile widgets. Those require an explicit widget name, mode, and allowed hostname(s), and
  should be managed as an intentional follow-up command rather than inferred from this scaffold.

## Development

```bash
pnpm --filter @pantrypanic/infra run lint
pnpm --filter @pantrypanic/infra run test:run
pnpm --filter @pantrypanic/infra run typecheck
```

The tests mock Cloudflare’s HTTP API and cover create, repeat/idempotent, dry-run, and optional
jurisdiction behavior. They make no network calls and do not create Cloudflare resources.
