<!-- eslint-disable markdown/no-multiple-h1 -->

# Frontend Data Management Layer Specification

## Goal

Implement the frontend data management layer for Pantry Panic using Pinia.

The application should load, read, mutate, cache, and refresh application data through Pinia stores.

Application components should not call API endpoints directly unless there is a very specific
reason. Instead, components should use Pinia store methods.

The Pinia layer should act as the frontend data access layer.

---

# Core Principles

## Pinia Is The Frontend Source Of Truth

All application data that is actively used by the app should be loaded into Pinia.

The Pinia state should roughly mirror the backend/domain schema:

- lists
- list items
- items
- recipes
- recipe items
- meal planner days
- meal planner day items
- current user

The shape does not need to exactly match the database schema, but it should be close enough that API
responses can be normalized into store state predictably.

---

## Normalize Store State

Prefer normalized state for frequently reused entities.

For example:

ts type EntityMap<T> = Record<string, T>

Use maps for entity lookup:

ts listsById listItemsById itemsById recipesById recipeItemsById mealPlannerDaysById
mealPlannerDayItemsById

Use ID arrays for ordering:

ts activeListIds listItemIdsByListId recipeItemIdsByRecipeId mealPlannerDayIds
mealPlannerDayItemIdsByDayId

This avoids deeply nested state becoming stale or hard to update.

---

# Runtime Refresh Configuration

Collaborative data should be refreshed automatically.

Use runtime config:

ts runtimeConfig.public.refreshInterval

Default value:

ts 5000

This means active data should refresh every 5 seconds by default.

The coding agent should add the appropriate Nuxt runtime config default.

Example:

ts export default defineNuxtConfig({ runtimeConfig: { public: { refreshInterval: 5000, }, }, })

---

# Refresh Strategy

## Active Data

Data currently visible or actively used by the app should be refreshed on an interval.

Examples:

- currently open list
- visible list items
- meal planner screen data
- recipe currently being edited
- active lists overview

## Passive Data

Frequently used data may be persisted and refreshed when needed.

Examples:

- lists
- canonical items
- frequently used suggestions
- recipes

## Refresh On Hydration

Persisted data should be shown immediately after hydration.

After hydration, stores should refresh from the API to reconcile stale local data with the backend.

This gives the app a fast startup while still correcting stale data.

---

# Persistence

Use Pinia persistence for frequently used data.

Persist at minimum:

- current user summary where safe
- lists
- list items for recently opened lists
- canonical items used in autocomplete
- item suggestions
- recipes
- meal planner days

Do not persist:

- session tokens
- raw cookies
- sensitive authentication material
- transient loading states
- transient error states
- optimistic operation queues unless explicitly designed for it

Persisted data should be treated as a cache, not as guaranteed truth.

The backend remains the source of truth.

---

# Optimistic Updates

Stores should perform optimistic updates for common user actions.

The general mutation flow should be:

1. Validate or normalize local input where useful.
2. Update Pinia state immediately.
3. Send request to API.
4. Reconcile store state with API response.
5. If request fails, roll back or refresh affected data.
6. Surface a user-friendly error.

Optimistic updates should be used for:

- checking a list item
- unchecking a list item
- adding a list item
- deleting a list item
- reordering list items
- reordering lists
- clearing a list
- adding a recipe to a list
- updating meal planner days
- adding meal planner contents to a list

For complex mutations, it is acceptable to refresh affected data instead of doing a perfect manual
rollback.

---

# Store Method Pattern

Each store should expose methods that application code can call.

Components should call store methods, not $fetch directly.

Example method categories:

ts fetchLists() createList(input) updateList(id, input) archiveList(id) deleteList(id)
reorderLists(orderedIds) fetchList(id) addListItem(listId, input) updateListItem(id, input)
checkListItem(id) uncheckListItem(id) deleteListItem(id) reorderListItems(listId, orderedIds)
clearList(listId)

Each method should:

- update loading/error state where useful
- perform the API call
- update normalized store state
- return typed data
- throw or expose standardized errors consistently

---

# Suggested Store Structure

The coding agent may freely implement a sensible store structure, that will be most useful for front
end consumption

---

# Refresh Composables

Create reusable refresh logic.

Suggested composable:

ts useStoreRefresh(options)

Responsibilities:

- read runtimeConfig.public.refreshInterval
- start interval
- stop interval
- pause when document is hidden if appropriate
- immediately refresh on demand
- avoid duplicate concurrent refreshes

Example behavior:

ts const refreshInterval = Number(config.public.refreshInterval ?? 5000)

The implementation should be safe for SSR and browser-only interval behavior.

---

# Error Handling In Stores

API errors should be normalized into a frontend error shape.

Suggested type:

ts type AppError = { code: string message: string details?: unknown }

Stores should not expose raw unknown errors directly to components.

Every store method should either:

- return typed data, or
- throw a normalized AppError, or
- set the store error state and return a typed failure result

Pick one consistent pattern and use it across stores.

Preferred pattern:

- store methods throw normalized errors
- store also stores last error for UI convenience

---

# API Client Wrapper

Create a shared API client wrapper around $fetch.

Responsibilities:

- enforce success/error envelope handling
- unwrap successful data
- convert API errors into AppError
- preserve Dutch validation messages from the backend
- provide typed generics

Example usage:

ts const list = await apiFetch<ListResponse>(`/api/lists/${listId}`)

Components and stores should not manually parse the API envelope everywhere.

---

# Hydration Behavior

On app startup:

1. Hydrate persisted Pinia state.
2. Fetch current user.
3. If authenticated:
   - refresh active lists
   - refresh suggestions
   - optionally refresh meal planner
4. When user opens a list:
   - show persisted data immediately if available
   - refresh list detail from API
   - start polling active list
5. When user leaves the list:
   - stop active list polling

---

# Collaboration Model

The app is collaborative but intentionally simple.

Use polling instead of realtime.

Conflict handling:

- backend is source of truth
- last write wins
- after failed optimistic updates, refresh affected data
- after successful writes, reconcile with server response

Examples:

- If both users check the same item, final state is checked.
- If one user deletes an item while another checks it, the next refresh should reflect the server
  result.
- If item ordering conflicts, the latest successful reorder wins.

Do not build complex conflict resolution in this pass.

---

# Persistence Details

Persist only stable cache state.

Recommended persisted stores:

- lists
- list items
- items/suggestions
- recipes
- meal planner

Recommended non-persisted fields:

- isLoading
- isSaving
- error
- intervals/timers
- temporary form state
- drag state

If using persisted Pinia, configure paths carefully so transient state is not stored.

---

# Completion Criteria

The frontend data management layer is complete when:

- application data is accessed through Pinia stores
- stores roughly mirror backend domain entities
- frequently used data is persisted
- hydrated persisted data is refreshed from the API
- active collaborative data refreshes on a configurable interval
- default refresh interval is 5 seconds
- common mutations use optimistic updates
- failed optimistic updates are rolled back or reconciled by refresh
- store methods provide typed CRUD operations
- components do not call API endpoints directly for domain data
- API errors are normalized into a consistent frontend error shape
