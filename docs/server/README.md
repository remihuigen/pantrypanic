# Server Routes

## Authentication

Authentication uses `nuxt-auth-utils` sessions with email/password login.

| Method       | Route                | Purpose                                                        |
| ------------ | -------------------- | -------------------------------------------------------------- |
| `POST`       | `/api/auth/login`    | Validate email/password credentials and create a user session. |
| `POST`       | `/api/auth/logout`   | Clear the current user session.                                |
| `GET/DELETE` | `/api/_auth/session` | Nuxt-auth-utils session endpoint used by `useUserSession()`.   |

`server/middleware/auth.ts` protects `/api/**` and `/images/**` with `server/utils/auth.ts`.

Requests are authenticated when either:

- a nuxt-auth-utils user session is present
- `x-api-token` matches `ADMIN_API_KEY`

Public server paths are `/api/auth/login` and `/api/_auth/session`.

## Blob Management

Blob storage is managed through server-only API routes backed by `@nuxthub/blob`.

API route files are organized by domain and route segment. Segment roots use `index.<method>.ts`,
for example `server/api/blobs/index.get.ts` for `GET /api/blobs`.

| Method            | Route                             | Purpose                                                                           |
| ----------------- | --------------------------------- | --------------------------------------------------------------------------------- |
| `GET`             | `/api/blobs`                      | List blob metadata with `limit`, `prefix`, `cursor`, and `folded` query support.  |
| `POST`            | `/api/blobs`                      | Upload one or more multipart form files from form key `files` by default.         |
| `POST`            | `/api/blobs/validate`             | Validate multipart form files without storing them.                               |
| `GET`             | `/api/blobs/**`                   | Read blob metadata for a pathname.                                                |
| `PUT`             | `/api/blobs/**`                   | Replace or create a blob from a raw request body.                                 |
| `DELETE`          | `/api/blobs/**`                   | Delete a blob pathname.                                                           |
| `POST/PUT/DELETE` | `/api/blobs/multipart/:action/**` | NuxtHub multipart upload handler for `create`, `upload`, `complete`, and `abort`. |

Validation is centralized in `server/utils/blob-storage.ts`.

- Pathnames must be relative and cannot contain empty, current, parent, backslash, or
  control-character segments.
- Multipart form uploads use `runtimeConfig.pantry.managedBlobMaxUploadSize` and default to `32MB`.
- Accepted stored asset types are safe raster images, video, audio, PDF, text, and JSON.
- Raw `PUT` uploads require `Content-Length` and a supported `Content-Type`.

## Blob Image Serving

`GET /images/**` serves blob contents for Nuxt Image and normal image URLs.

The route serves only safe raster image metadata types: JPEG, PNG, WebP, GIF, and AVIF. SVG is not
served from this route.

## User Management

User CRUD routes are server-only API routes backed by NuxtHub DB and Drizzle.

User route files follow the domain-folder convention, for example `server/api/users/index.get.ts`
for `GET /api/users` and `server/api/users/[userId]/index.get.ts` for `GET /api/users/:userId`.

| Method   | Route                | Purpose                                                       |
| -------- | -------------------- | ------------------------------------------------------------- |
| `GET`    | `/api/users`         | List users with `email`, `limit`, and `offset` query support. |
| `POST`   | `/api/users`         | Create a user from `name`, `email`, and `password`.           |
| `GET`    | `/api/users/:userId` | Read one user by id.                                          |
| `PUT`    | `/api/users/:userId` | Update one or more user fields.                               |
| `PATCH`  | `/api/users/:userId` | Update one or more user fields.                               |
| `DELETE` | `/api/users/:userId` | Delete a user by id.                                          |

Responses omit the `password` field. Passwords are stored as scrypt hashes. Fine-grained permission
checks are intentionally not implemented yet.

## Pantry Panic Domain API

Pantry Panic domain routes are authenticated API routes backed by NuxtHub DB and Drizzle.

Route handlers live in `server/api/*` and delegate shared behavior to `server/utils/api-core.ts` and
`server/domains.ts`, which re-exports focused modules from `server/utils/domains/*` (for example
`lists.ts`, `recipes.ts`, `meal-planner.ts`, `items.ts`, and `seed.ts`). Zod validates route params,
query strings, and request bodies at the API boundary.

New domain routes return this success shape:

```json
{ "success": true, "data": {} }
```

Validation and runtime failures return:

```json
{
  "success": false,
  "error": { "code": "VALIDATION_ERROR", "message": "De ingevoerde gegevens zijn ongeldig." }
}
```

| Method  | Route                                                      | Purpose                                                               |
| ------- | ---------------------------------------------------------- | --------------------------------------------------------------------- |
| `GET`   | `/api/me`                                                  | Return the current authenticated user summary.                        |
| `GET`   | `/api/lists`                                               | List shopping lists by status.                                        |
| `POST`  | `/api/lists`                                               | Create a reusable shopping list.                                      |
| `POST`  | `/api/lists/reorder`                                       | Reorder active shopping lists.                                        |
| `GET`   | `/api/lists/:listId`                                       | Read a list with visible items.                                       |
| `PATCH` | `/api/lists/:listId`                                       | Update list metadata.                                                 |
| `POST`  | `/api/lists/:listId/archive`                               | Soft-archive a list.                                                  |
| `POST`  | `/api/lists/:listId/delete`                                | Soft-delete a list.                                                   |
| `POST`  | `/api/lists/:listId/clear`                                 | Archive visible list items.                                           |
| `POST`  | `/api/lists/:listId/items`                                 | Add a manual item occurrence to a list.                               |
| `POST`  | `/api/lists/:listId/items/reorder`                         | Reorder visible list items.                                           |
| `PATCH` | `/api/list-items/:listItemId`                              | Update list assignment, item name, and occurrence metadata.           |
| `POST`  | `/api/list-items/:listItemId/check`                        | Mark a list item checked.                                             |
| `POST`  | `/api/list-items/:listItemId/uncheck`                      | Mark a list item unchecked.                                           |
| `POST`  | `/api/list-items/:listItemId/delete`                       | Soft-delete a list item.                                              |
| `GET`   | `/api/items/search`                                        | Search canonical items by normalized name.                            |
| `GET`   | `/api/items/suggestions`                                   | Return frequently used archived items.                                |
| `GET`   | `/api/recipes`                                             | List recipes by status and optional query.                            |
| `POST`  | `/api/recipes`                                             | Create a recipe and optional ingredients.                             |
| `GET`   | `/api/recipes/:recipeId`                                   | Read recipe details with ordered ingredients.                         |
| `PATCH` | `/api/recipes/:recipeId`                                   | Update recipe metadata.                                               |
| `POST`  | `/api/recipes/:recipeId/archive`                           | Soft-archive a recipe.                                                |
| `POST`  | `/api/recipes/:recipeId/delete`                            | Soft-delete a recipe.                                                 |
| `POST`  | `/api/recipes/:recipeId/items`                             | Add an ingredient to a recipe.                                        |
| `POST`  | `/api/recipes/:recipeId/items/reorder`                     | Reorder recipe ingredients.                                           |
| `POST`  | `/api/recipes/:recipeId/add-to-list`                       | Copy recipe ingredients into a shopping list.                         |
| `PATCH` | `/api/recipe-items/:recipeItemId`                          | Update recipe-item metadata.                                          |
| `POST`  | `/api/recipe-items/:recipeItemId/delete`                   | Hard-delete a recipe item.                                            |
| `GET`   | `/api/meal-planner`                                        | Read the singleton seven-day meal planner.                            |
| `POST`  | `/api/meal-planner/clear`                                  | Reset all planner days and hard-delete placeholder ingredients.       |
| `POST`  | `/api/meal-planner/add-to-list`                            | Copy planned recipe and placeholder ingredients into a shopping list. |
| `PATCH` | `/api/meal-planner/days/:dayOfWeek`                        | Set a day to empty, recipe, or placeholder.                           |
| `POST`  | `/api/meal-planner/days/:dayOfWeek/items`                  | Add an ingredient to a placeholder day.                               |
| `POST`  | `/api/meal-planner/days/:dayOfWeek/items/reorder`          | Reorder placeholder-day ingredients.                                  |
| `PATCH` | `/api/meal-planner/day-items/:mealPlannerDayItemId`        | Update placeholder-day ingredient metadata.                           |
| `POST`  | `/api/meal-planner/day-items/:mealPlannerDayItemId/delete` | Hard-delete a placeholder-day ingredient.                             |

Domain write routes update audit fields. List-item PATCH accepts `listId`, `name`, `amount`,
`unit`, and `note`; moving to another list appends the item at the target list's next visible
position. Lists, recipes, and list items use status-based soft deletion. Recipe items and
meal-planner placeholder ingredients are hard-deleted because they are volatile child/draft data.

### Short-Lived Read Cache

Expensive or commonly polled domain reads use Nitro cached event handlers through
`defineCachedApiHandler()` in `server/utils/api-core.ts`:

- `GET /api/lists`
- `GET /api/lists/:listId`
- `GET /api/items/search`
- `GET /api/items/suggestions`
- `GET /api/recipes`
- `GET /api/recipes/:recipeId`
- `GET /api/meal-planner`

Nitro derives cached handler keys from the full request URL, including query params. SWR is disabled
for these API reads, so stale data is not served after the cache age. The max age is capped by
`runtimeConfig.public.refreshInterval`, which can be configured with `NUXT_PUBLIC_REFRESH_INTERVAL`;
intervals under one second bypass the cache.

## Admin User Seed

The build runs a Nuxt `build:done` hook that calls `scripts/seed-admin-user.mjs`.

The seed reads `ADMIN_USER_EMAIL`, `ADMIN_USER_PASSWORD`, `ADMIN_API_KEY`, and
`NUXT_PUBLIC_SITE_URL` from the environment. It checks whether that email already exists by calling
`GET /api/users?email=<email>&limit=1`, then creates the user with `POST /api/users` if missing.

Both requests use `x-api-token: ADMIN_API_KEY`, so the seed can run against the current instance or
a remote deployment URL.

If the configured instance is unreachable during build, the seed logs a warning and skips without
failing the build.

The deployment workflow sets `SKIP_ADMIN_SEED=1` during build and runs `pnpm seed:admin` after
migrations and deployment complete.
