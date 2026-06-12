# Frontend Data Layer

The frontend data access layer is implemented with Pinia stores and shared API helpers.

## Stores

- `app/stores/lists.ts`
- `app/stores/recipes.ts`
- `app/stores/meal-planner.ts`
- `app/stores/settings.ts`

## Shared Helpers

- `shared/types/api.ts`: shared API envelope and app error types for both server and frontend.
- `shared/utils/schemas/domain.ts`: shared Zod schemas for request contracts and frontend-consumed
  domain types.
- `app/utils/api-client.ts`: unwraps API success/error envelopes and normalizes errors.
- `app/composables/useStoreRefresh.ts`: the single route-aware refresh scheduler plus the shared
  interval primitive. Refresh timing comes from runtime config and the household-settings override
  loaded by the settings store.
- `app/plugins/data-hydration.client.ts`: starts the route-aware refresh scheduler after session and
  household membership context are available.

## App Routes And Rendering

- Product app pages live under `/app`, backed by files in `app/pages/app/**`.
- Current app routes include `/app/lists`, `/app/lists/:id`, `/app/recipes`, `/app/recipes/:id`,
  `/app/meal-planner`, `/app/settings`, `/app/settings/household`, `/app/settings/item-vault`, and
  `/app/settings/stats`.
- `/` serves the public landing page. `/app` redirects to `/app/lists`.
- `nuxt.config.ts` sets `routeRules` with `ssr: true` for `/app` and `/app/**` so product app pages
  render through Nuxt's normal SSR path.
- `/login` and `/logout` remain outside the `/app` namespace and keep normal server rendering so
  auth entry points continue to work without depending on the app shell.
- Global route middleware only enforces session auth for `/app` routes. Future public or marketing
  pages can remain outside `/app` and opt into prerendering separately.

## PWA Prompts

- `@vite-pwa/nuxt` runs in prompt mode so new service-worker versions surface through the app toast
  before the user applies the update.
- The custom install flow is enabled through `pwa.client.installPrompt`; the module captures the
  browser `beforeinstallprompt` event and exposes it through `$pwa.showInstallPrompt`.
- PWA install and update toasts are handled in `app/app.vue` so prompt state is observed globally,
  independent of the active route layout.
- Browser support for native install prompts is platform-dependent. Browsers that do not emit
  `beforeinstallprompt` still require their own manual install UI.

## Design Notes

- Store state is normalized around id maps and id arrays.
- Persisted fields are cache-like and exclude transient loading/error state.
- Common user actions use optimistic updates with rollback/reconciliation.
- Backend remains source of truth; polling reconciles collaborative changes through one global
  scheduler that calls `orchestrateRefresh()` and only fetches the active route namespace.
- Route pages are still responsible for fetching required data when the user enters the route.
  Interval refresh is a background reconciliation path, not the initial page-load data source.
- Recipe overview favorites are derived from local per-user browser usage counts. The count is
  incremented when a recipe is copied to a list and is not synchronized through the backend.
- Settings is split into subroutes: general profile/theme/danger-zone controls, household
  settings/member links, canonical item maintenance, and usage stats.
- Household-owner-only controls are rendered through Nuxt Authorization abilities; users with no
  active household are handled globally in the app layout with Dutch guidance asking them to
  request a new household invite, plus account deletion and household creation actions when
  available.

## Error Feedback Pattern

- For API submission failures in forms, show errors via toast notifications (`useToast`) instead of
  inline `UAlert` messages.
- Keep inline field validation in `UForm` / `UFormField` for schema errors; reserve toast errors for
  request/response failures after submit.
- Match auth flow behavior (`app/pages/(auth)/login.vue`):
  - `color: 'error'`
  - actionable failure title/message
  - finite duration (for example `8000`)
  - alert icon (`i-lucide-circle-alert`)
