# Project Overview (Agent)

## Product Shape

This is a Nuxt 4 app extending the Docus layer for a Dutch school-leadership handreiking.

Active runtime features:

- Docus docs site + custom homepage
- custom docs pages that aggregate content collections
- Nuxt Studio editing flow
- Sentry and Plausible integrations
- Docus AI assistant configured with Mistral model
- Cloudflare Worker deployment
- Nuxt UI as primary UI system
- one local Inspira/shadcn-style component (`app/components/PatternBackground.vue` +
  `app/composables/pattern-background.ts`)

## Core Directories

- `app/`
- `content/`
- `config/`
- `server/`
- `shared/types/`
- `docs/` (human)
- `.agents/` (agent)

## Codebase Reality Check

Use current code and current runtime behavior as source of truth when updating docs.
