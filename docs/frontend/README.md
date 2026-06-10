# Frontend Data Layer

The frontend data access layer is implemented with Pinia stores and shared API helpers.

## Stores

- `app/stores/lists.ts`
- `app/stores/recipes.ts`
- `app/stores/meal-planner.ts`

## Shared Helpers

- `shared/types/api.ts`: shared API envelope and app error types for both server and frontend.
- `shared/utils/schemas/domain.ts`: shared Zod schemas for request contracts and frontend-consumed
  domain types.
- `app/utils/api-client.ts`: unwraps API success/error envelopes and normalizes errors.
- `app/composables/useStoreRefresh.ts`: interval-based polling with runtime-configured refresh
  timing.
- `app/plugins/data-hydration.client.ts`: startup hydration refresh for persisted store caches.

## Design Notes

- Store state is normalized around id maps and id arrays.
- Persisted fields are cache-like and exclude transient loading/error state.
- Common user actions use optimistic updates with rollback/reconciliation.
- Backend remains source of truth; polling reconciles collaborative changes.
