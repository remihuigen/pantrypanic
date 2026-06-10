# Pantry Panic

Pantry Panic is a publicly available, easy-to-host grocery list manager for your household.

## Why _another_ list manager app?

The answer is quite simple: to make my wife stop complaining about whatever list app she is using at
the moment.

List management apps tend to go one of two ways: either they are overengineered family planner apps,
or they are simple checkbox apps with horrendous UX that lack the smart features that make grocery
planning not suck.

Pantry Panic tries to hit the sweet spot in between: we don't overindulge in complexity, but the app
is smart enough to prevent repetitiveness. Due to it's local first strategy it feels super fast.

Oh yeah — did I mention it's **free and self-hostable**? All you need is a (free) Cloudflare
account.

## Deploy Pantry Panic

To deploy your own Pantry Panic instance to Cloudflare, follow the steps below. For details on local
development, see the [Local Setup](#local-setup) section.

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
NUXT_PUBLIC_SITE_URL=<instance-url> # Will become available after the initial deployment

# Repository secrets
CLOUDFLARE_DATABASE_ID=<database-id>
CLOUDFLARE_CACHE_NAMESPACE_ID=<namespace-id>
CLOUDFLARE_R2_BUCKET=<bucket-name>
CLOUDFLARE_API_TOKEN=<api-token>
CLOUDFLARE_ACCOUNT_ID=<account-id>

NUXT_SESSION_PASSWORD=<hashing-secret>
ADMIN_API_KEY=<admin-api-key>

ADMIN_USER_EMAIL=<initial-user-email>
# Choose a password with at least 8 characters
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

## Local Setup

First, fork and clone this project to your local environment.

### Requirements

- pnpm 10
- node 24

### Getting Started

Install dependencies:

```bash
pnpm install
```

Copy and rename `.example.env` to `.env` and update the values as needed.

Runtime-tunable Pantry defaults live in `runtimeConfig.pantry` and can be overridden with matching
Nuxt environment variables, for example:

```bash
NUXT_PANTRY_DEFAULT_LIST_NAME=Boodschappen
NUXT_PANTRY_DEFAULT_ITEM_SEARCH_LIMIT=10
NUXT_PANTRY_MANAGED_BLOB_MAX_UPLOAD_SIZE=32MB
```

Production blob/database/cache configuration also expects, though these are not needed for local
development

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

Seed the initial admin user:

```bash
pnpm seed:admin
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

Production deployment runs through `.github/workflows/deploy.yml`: it builds for Cloudflare, applies
D1 migrations with Wrangler, deploys the Worker, then runs the HTTP admin seed. For a full step by
step guide on deploying your own Pantry Panic instance to production, see
[Deploy Pantry Panic](#deploy-pantry-panic).

## Documentation

- Human docs: [docs/](./docs/README.md)
- Agent docs: [.agents/](./.agents/README.md)

## Stack

This project is made possible by my favorite stack 💚. Except Cloudflare. I don't like Cloudflare
that much - but it's cheap.

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

## License

This project is licensed under the MIT License. See the [LICENSE](./LICENSE) file for details.
