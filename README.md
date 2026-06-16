![Pantry Panic Banner](.github/assets/banner.png)

# Pantry Panic

Pantry Panic is a fast, self-hostable grocery list app for households that want something smarter
than a checkbox list, but less annoying than a family planner.

## 🤔 Why _another_ list manager app?

The answer is quite simple: to make my wife stop complaining about whatever list app she is using at
the moment.

List management apps tend to go one of two ways: either they are overengineered family planner apps,
or they are simple checkbox apps with horrendous UX that lack the smart features that make grocery
planning not suck.

Pantry Panic tries to hit the sweet spot in between: we don't overindulge in complexity, but the app
is smart enough to prevent repetitiveness. Due to its local-first strategy, it feels super fast.

Oh yeah — did I mention it's **free and self-hostable**? All you need is a (free) Cloudflare
account.

## ✨ Core Features

- 🛒 Shared household grocery lists with realtime collaboration
- ✨ Smart item suggestions based on previous shopping behavior
- 📖 Recipe catalog for storing your favorite meals
- 🍽️ Meal planner to organize your week
- ⚡ Local-first architecture and a snappy user experience

## 🚀 Deploy Pantry Panic

Deploying Pantry Panic takes about 10–15 minutes.

### 📋 Prerequisites

Before you begin, make sure you have:

- A Cloudflare account
- A GitHub account
- Basic familiarity with the Cloudflare dashboard
- Basic familiarity with the Github Actions and Github Secrets

If you don't already have a Cloudflare account, you can create one at
[https://dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up). The free tier is more
than enough for most households.

### Single vs. Multi household

Pantry Panic can run in two household modes. Pick the smallest mode that matches how you want to use
the instance.

**Single household mode** is the default:

```bash
ENABLE_MULTI_TENANCY=false
```

Use this for a private family instance where everyone belongs to the same household. The app creates
or reuses one default household named `Thuis`, all seeded/admin users are attached to it, and domain
data such as lists, recipes, items, and the meal planner are scoped to that singleton household.
This is the simplest and most predictable setup for most self-hosted installs.

**Multi household mode** enables household switching:

```bash
ENABLE_MULTI_TENANCY=true
```

Use this when one Pantry Panic instance should host multiple separate households. Users only see
data for households they are a member of, and the active household is stored in their session.
Existing household owners can invite others with invite links from settings. Household owners can
manage members, promote other members to owner, create reset links, change household settings, clear
app data, and destroy the household. Regular members can still use the app's core grocery, recipe,
and meal-planner flows.

`ENABLE_HOUSEHOLD_CREATION=true` lets logged-in users create their first or an extra household from
the household selector. Keep it `false` when household owners should control membership strictly
through invite links. `ENABLE_PUBLIC_REGISTRATION=false` keeps public account creation disabled;
invite-link onboarding still works because invites are token-gated. Public registration is
configuration-only for now and is not exposed in the app yet. If a user no longer belongs to any
household and household creation is disabled, they need a new invite from a household owner before
they can use the app again.

### 1️⃣ Step 1: Create Cloudflare Resources

Create the following resources in your Cloudflare dashboard:

- [ ] A D1 database
  - Write down the `database UUID`
  - If you are located in the EU, consider opting into EU jurisdiction
- [ ] An R2 bucket
  - Write down the `bucket name`
  - If you are located in the EU, consider opting into EU jurisdiction
- [ ] A Workers KV namespace
  - Write down the `namespace ID`

### 2️⃣ Step 2: Create an API Token

Navigate to **Account API Tokens** in the Cloudflare dashboard and create a new token with
read/write access to Worker-related resources.

Make sure to copy the token immediately and store it somewhere safe. Cloudflare will not show it
again after creation.

### 3️⃣ Step 3: Find Your Account ID

Locate your Cloudflare Account ID. You can find it in the dashboard URL:

```text
https://dash.cloudflare.com/<account-id>
```

### 4️⃣ Step 4: Fork the Repository

Fork this repository into your own GitHub account.

### 5️⃣ Step 5: Generate Secrets

Generate a hashing secret and admin API key:

```bash
openssl rand -hex 32
```

Run it twice and store both values somewhere safe.

### 6️⃣ Step 6: Configure GitHub Secrets and Variables

In your fork, navigate to:

```text
Settings → Secrets and Variables → Actions
```

Add the following variables and secrets.

```text
# Repository variables
CLOUDFLARE_WORKER_NAME=<worker-name> # Defaults to `pantrypanic`
NUXT_PUBLIC_SITE_URL=<instance-url> # Added after the first deployment

# Repository secrets
CLOUDFLARE_D1_DATABASE_ID=<database-id>
CLOUDFLARE_R2_BUCKET=<bucket-name>

CLOUDFLARE_API_TOKEN=<api-token>
CLOUDFLARE_ACCOUNT_ID=<account-id>

NUXT_SESSION_PASSWORD=<hashing-secret>
ADMIN_API_KEY=<admin-api-key>

ADMIN_USER_EMAIL=<initial-user-email>

# Choose a password with at least 8 characters
ADMIN_USER_PASSWORD=<initial-user-password>

# Household mode
ENABLE_MULTI_TENANCY=false
ENABLE_HOUSEHOLD_CREATION=false
ENABLE_PUBLIC_REGISTRATION=false

# App defaults
NUXT_PUBLIC_REFRESH_INTERVAL=5000
NUXT_PANTRY_DEFAULT_LIST_NAME=Boodschappen
NUXT_PANTRY_DEFAULT_USER_LIST_LIMIT=50
NUXT_PANTRY_MAX_USER_LIST_LIMIT=100
NUXT_PANTRY_DEFAULT_ITEM_SEARCH_LIMIT=10
NUXT_PANTRY_MAX_ITEM_SEARCH_LIMIT=50
NUXT_PANTRY_DEFAULT_BLOB_LIST_LIMIT=100
NUXT_PANTRY_MAX_BLOB_LIST_LIMIT=1000
NUXT_PANTRY_MANAGED_BLOB_MAX_UPLOAD_SIZE=32MB
```

### 7️⃣ Step 7: Deploy

Navigate to **GitHub Actions** and manually run the **Deploy** workflow.

The deployment workflow will:

1. Build the application
2. Apply database migrations
3. Deploy the Cloudflare Worker
4. Seed the initial admin user

### 8️⃣ Step 8: Configure Your Domain

After deployment finishes, determine how you want to access your instance.

#### Option A: Custom Domain

1. Configure your DNS records according to the Cloudflare documentation
2. Open your newly created Worker
3. Attach your custom domain

#### Option B: workers.dev

Find the generated `workers.dev` URL:

- In the Cloudflare dashboard
- Or in the GitHub Actions deployment logs

### 9️⃣ Step 9: Update the Site URL

Return to your GitHub repository variables and update:

```text
NUXT_PUBLIC_SITE_URL=<your-domain-or-workers-url>
```

### 🔟 Step 10: Redeploy

Run the Deploy workflow one more time.

Your Pantry Panic instance should now be fully operational.

Navigate to your domain (or `workers.dev` URL) and log in using the credentials you configured in
Step 6.

### ⬆️ Updating Pantry Panic

Pantry Panic currently does not publish official releases.

To update your instance:

1. Sync your fork with the upstream repository
2. Push or merge the changes
3. GitHub Actions will automatically redeploy if new commits are detected

## 💻 Local Setup

First, fork and clone the repository.

### 📦 Requirements

- pnpm 10
- Node.js 24

Node.js 24 is configured through the included `.nvmrc` file.

### 🏁 Getting Started

Install dependencies:

```bash
pnpm install
```

Copy `.example.env` to `.env` and update the values as needed. The important local configuration
values are:

```bash
ENABLE_MULTI_TENANCY=false
ENABLE_HOUSEHOLD_CREATION=false
ENABLE_PUBLIC_REGISTRATION=false
NUXT_PUBLIC_REFRESH_INTERVAL=5000
NUXT_PANTRY_DEFAULT_LIST_NAME=Boodschappen
NUXT_PANTRY_DEFAULT_USER_LIST_LIMIT=50
NUXT_PANTRY_MAX_USER_LIST_LIMIT=100
NUXT_PANTRY_DEFAULT_ITEM_SEARCH_LIMIT=10
NUXT_PANTRY_MAX_ITEM_SEARCH_LIMIT=50
NUXT_PANTRY_DEFAULT_BLOB_LIST_LIMIT=100
NUXT_PANTRY_MAX_BLOB_LIST_LIMIT=1000
NUXT_PANTRY_MANAGED_BLOB_MAX_UPLOAD_SIZE=32MB
```

`ENABLE_MULTI_TENANCY`, `ENABLE_HOUSEHOLD_CREATION`, and `ENABLE_PUBLIC_REGISTRATION` are available
in public runtime config for UI affordances and private runtime config for server decisions. API
routes read the private values. The `NUXT_PANTRY_*` variables are wired directly to
`runtimeConfig.pantry` in `nuxt.config.ts`.

Production blob and database configuration also expects the following variables, though they are not
required for local development:

```bash
CLOUDFLARE_D1_DATABASE_ID=<database-id>
CLOUDFLARE_R2_BUCKET=<bucket-name>
```

## 🛠️ Development

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

## ✅ Validation

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

Production deployment runs through `.github/workflows/deploy.yml`. The workflow builds the
application for Cloudflare, applies D1 migrations with Wrangler, deploys the Worker, and finally
runs the HTTP admin seed.

For a complete deployment guide, see [Deploy Pantry Panic](#-deploy-pantry-panic).

## 📚 Documentation

- Human documentation: [docs/](./docs/README.md)
- Agent documentation: [.agents/](./.agents/README.md)

## 🧩 Stack

This project is made possible by my favorite stack 💚.

Except Cloudflare. I don't like Cloudflare that much — but it's cheap.

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
- Cloudflare D1, KV, and R2 (production)

## 📝 License

Pantry Panic is source-available under the PolyForm Noncommercial License 1.0.0.

You may use, copy, modify, and self-host Pantry Panic for non-commercial purposes.

Commercial use is not permitted without prior written permission. This includes, but is not limited
to:

- selling Pantry Panic or a modified version of it;
- offering Pantry Panic as a hosted service;
- using Pantry Panic as part of a paid product or commercial service;
- using Pantry Panic internally within a commercial organization.

For more details, see the [License](./LICENSE.md). For commercial licensing, contact:
remihuigen@proton.me
