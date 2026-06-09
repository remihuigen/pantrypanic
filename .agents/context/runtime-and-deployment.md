# Runtime And Deployment (Agent)

## Nuxt Runtime

- `extends: ['docus']`
- Nitro preset: `cloudflare_module`
- Nuxt Content local DB for dev/prerender is memory-backed:
  - `content._localDatabase = { type: 'sqlite', filename: ':memory:' }`
  - prevents stale file reuse (`_content_docs` missing-table failures after `prepare/typecheck`)
- production route rule prerenders `/**`
- `/assets/**` served through blob route
- `/stats` redirects to Plausible dashboard
- temporary Docus patch active (locale, OG font, MCP transport, type compat, sitemap):
  - `patches/docus@5.9.0.patch`
  - `pnpm-workspace.yaml` patched dependency entry for `docus@5.9.0`
  - full inventory tracked in `.agents/context/i18n-patches.md`

## Typecheck Compatibility

- Active Docus patch (`patches/docus@5.9.0.patch`) also contains Docus typecheck compatibility fixes
  for Nuxt 4 tooling.
- Temporary schema shim:
  - `shared/types/docus-types-compat.d.ts`
- Removal criteria:
  - remove shim when upstream Docus/Nuxt type compatibility is fixed and `pnpm typecheck` passes
    without local compatibility declarations.
- `app/app.config.ts` uses a `uiConfig` variable (instead of inline literal typing casts) to keep
  custom UI keys accepted without `any` in app code.
- `app/app.config.ts` must keep `github` runtime-disabled (`false`) so Docus does not render GitHub
  actions; a typed boundary cast is used to bridge current schema typing mismatch.

## UI Runtime

- Core UI: Nuxt UI
- Single local Inspira/shadcn-style component: `app/components/PatternBackground.vue` +
  `app/composables/pattern-background.ts`
- shadcn-style config: `components.json`
- OG image templates are locally overridden:
  - `app/components/OgImage/Docs.takumi.vue`
  - `app/components/OgImage/Landing.takumi.vue`
  - both force `font-family: 'Poppins', sans-serif`

## Cloudflare Bindings

Expected bindings:

- D1: `DB`
- KV: `CACHE`
- R2: `BLOB`

Configured in `nuxt.config.ts` under `nitro.cloudflare.wrangler`.

## Studio And Branching

Studio repository config points to branch `content`.

Automation:

- `content_promote.yml` promotes `content/**` changes to `main`
- `sync_main_to_content.yml` syncs `main` back into `content`
- auto production deploys happen only for content-only pushes on `main`

## AI Assistant

- `assistant.model = 'mistral/mistral-medium'`
- gateway key from `AI_GATEWAY_API_KEY`
- assistant consumes MCP tools from `/mcp` (Docus + `@nuxtjs/mcp-toolkit`)
- Cloudflare MCP transport requires runtime package `agents` (for `agents/mcp` import)
- active Docus patch fixes MCP transport for Cloudflare Workers:
  - uses `event.fetch` with relative paths for Nitro internal routing (avoids 522 self-fetch)
  - sets `Accept: application/json, text/event-stream` header (avoids 406)
  - see `.agents/context/i18n-patches.md` section 3 for full detail
- custom project MCP tools:
  - `search-knowledge`
  - `list-insights`
  - `recommend-insights`
  - `list-faqs`
- custom tools are fail-fast hardened:
  - collection reads run with timeouts and fallback behavior to avoid assistant hangs
- each custom MCP tool file has an inline top-level "File overview" comment documenting purpose and
  usage:
  - `server/mcp/tools/search-knowledge.ts`
  - `server/mcp/tools/list-insights.ts`
  - `server/mcp/tools/recommend-insights.ts`
  - `server/mcp/tools/list-faqs.ts`
- no custom `/api/ai/*` feature set currently present

## OG Font Guardrails

- `@nuxt/fonts` provides `Poppins` with `global: true` in `nuxt.config.ts`.
- Docus base OG generation requires explicit `fontFamily` to avoid fallback font rendering.
- Active implementation:
  - custom pages call `defineOgImage(..., { fontFamily: 'Poppins' })`
  - `patches/docus@5.9.0.patch` injects `fontFamily: 'Poppins'` into Docus docs/landing OG calls
- Removal criteria:
  - only remove Docus patch lines when upstream Docus supports a stable OG font config route or no
    longer needs explicit family to use configured project fonts.

## Testing State

- no test scripts currently in `package.json`
- `pnpm lint` and `pnpm typecheck` are the active local verification commands
