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

Copy `.example.env` to `.env` and update the values as needed.

Runtime-tunable Pantry defaults live in `runtimeConfig.pantry` and can be overridden through Nuxt
environment variables:

```bash
NUXT_PANTRY_DEFAULT_LIST_NAME=Boodschappen
NUXT_PANTRY_DEFAULT_ITEM_SEARCH_LIMIT=10
NUXT_PANTRY_MANAGED_BLOB_MAX_UPLOAD_SIZE=32MB
```

Production blob, database, and cache configuration also expects the following variables, though they
are not required for local development:

```bash
CLOUDFLARE_D1_DATABASE_ID=<database-id>
CLOUDFLARE_CACHE_NAMESPACE_ID=<namespace-id>
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

For a complete deployment guide, see [Deploy Pantry Panic](#deploy-pantry-panic).

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

This project is licensed under the MIT License.

See the [LICENSE](./LICENSE) file for details.
