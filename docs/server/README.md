# Server Routes

## Authentication

Authentication uses `nuxt-auth-utils` sessions with email/password login.

| Method       | Route                | Purpose                                                        |
| ------------ | -------------------- | -------------------------------------------------------------- |
| `POST`       | `/api/auth/login`                 | Validate email/password credentials and create a user session. |
| `POST`       | `/api/auth/logout`                | Clear the current user session.                                |
| `POST`       | `/api/access-links/invite/accept` | Consume an invite link and create/join a household session.    |
| `POST`       | `/api/access-links/reset/accept`  | Consume a reset-access link and create a user session.         |
| `GET/DELETE` | `/api/_auth/session`              | Nuxt-auth-utils session endpoint used by `useUserSession()`.   |

`server/middleware/auth.ts` protects `/api/**` and `/images/**` with `server/utils/auth.ts`.

Requests are authenticated when either:

- a nuxt-auth-utils user session is present
- `x-api-token` matches `ADMIN_API_KEY`

Public server paths are `/api/auth/login`, invite/reset access-link acceptance, and
`/api/_auth/session`.

Invite acceptance is additionally protected by Turnstile when `ENABLE_TURNSTILE=true`.
`server/utils/turnstile.ts` reads the client token from `x-turnstile-token`, verifies the expected
action, and allows `x-api-token: ADMIN_API_KEY` requests to bypass Turnstile for trusted
server-to-server flows.

## Household Context

Domain APIs are household-scoped. `server/utils/domains/households.ts` resolves the active
household from the session. With `ENABLE_MULTI_TENANCY=false`, the first/default household is used
as a singleton. With multi-tenancy enabled, users can switch to another household membership through
`POST /api/households/switch`. When `ENABLE_HOUSEHOLD_CREATION=true`, logged-in users can create a
new household with `POST /api/households`.

Household memberships have a `role` of `member` or `householdOwner`. Owner-only operations use
Nuxt Authorization abilities on both the client and server. Server handlers pass an ability to
`getHouseholdContext(event, { authorize: ability })`, which resolves the active household, loads
the current membership role, and calls Nuxt Authorization's server `authorize()` before returning
the context. A household may have multiple owners. Owners can invite users, generate reset-access
links, remove members, promote members to owner, update household settings, clear household app
data, and destroy the household. Removing or leaving a household is rejected when it would leave
other members without an owner. If the last member leaves or deletes their account, the household
and all associated domain data are destroyed. In single-household mode, destroying the default
household, deleting the last household-owner account, or deleting the only remaining account before
membership hydration is rejected.

| Method   | Route                                                 | Purpose                                     |
| -------- | ----------------------------------------------------- | ------------------------------------------- |
| `GET`    | `/api/households`                                     | List memberships and active household.      |
| `POST`   | `/api/households`                                     | Create a household for the current user.    |
| `POST`   | `/api/households/switch`                              | Store active household id in the session.   |
| `GET`    | `/api/households/current/settings`                    | Read household-wide settings.               |
| `PATCH`  | `/api/households/current/settings`                    | Update household-wide settings.             |
| `GET`    | `/api/households/current/members`                     | List household members.                     |
| `DELETE` | `/api/households/current/members/:userId`             | Remove membership, not the account.         |
| `POST`   | `/api/households/current/members/:userId/owner`       | Promote a member to household owner.        |
| `POST`   | `/api/households/current/invites`                     | Generate a one-time invite link.            |
| `POST`   | `/api/households/current/members/:userId/reset-link`  | Generate a one-time reset-access link.      |
| `POST`   | `/api/households/current/leave`                       | Leave the active household.                 |
| `DELETE` | `/api/households/current`                             | Destroy the active household.               |

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
| `DELETE` | `/api/users/:userId` | Delete a user through the shared account deletion flow.       |

Responses omit the `password` field. Passwords are stored as scrypt hashes. User deletion follows
the same household ownership, last-member, and orphaned-account cleanup rules as `DELETE
/api/profile`.

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
| `GET`   | `/api/profile`                                             | Return editable profile data.                                         |
| `PATCH` | `/api/profile`                                             | Update name, email, avatar pathname, or password.                     |
| `DELETE`| `/api/profile`                                             | Delete the current user account after household safety checks.        |
| `POST`  | `/api/profile/avatar`                                      | Upload a raster avatar blob and store it on the user.                 |
| `GET`   | `/api/lists`                                               | List shopping lists by status.                                        |
| `POST`  | `/api/lists`                                               | Create a reusable shopping list.                                      |
| `POST`  | `/api/lists/reorder`                                       | Reorder active shopping lists.                                        |
| `GET`   | `/api/lists/:listId`                                       | Read a list with visible items.                                       |
| `PATCH` | `/api/lists/:listId`                                       | Update list metadata.                                                 |
| `POST`  | `/api/lists/:listId/archive`                               | Soft-archive a list.                                                  |
| `POST`  | `/api/lists/:listId/delete`                                | Soft-delete a list.                                                   |
| `POST`  | `/api/lists/:listId/clear`                                 | Archive visible list items.                                           |
| `POST`  | `/api/lists/:listId/clear-checked`                         | Archive checked list items.                                           |
| `POST`  | `/api/lists/:listId/items`                                 | Add a manual item occurrence to a list.                               |
| `POST`  | `/api/lists/:listId/items/reorder`                         | Reorder visible list items, optionally grouped by category.           |
| `PATCH` | `/api/list-items/:listItemId`                              | Update list/category assignment, item name, and occurrence metadata.  |
| `POST`  | `/api/list-items/:listItemId/check`                        | Mark a list item checked.                                             |
| `POST`  | `/api/list-items/:listItemId/uncheck`                      | Mark a list item unchecked.                                           |
| `POST`  | `/api/list-items/:listItemId/delete`                       | Soft-delete a list item.                                              |
| `GET`   | `/api/items/search`                                        | Search canonical items by normalized name.                            |
| `GET`   | `/api/items/suggestions`                                   | Return frequently used archived items.                                |
| `GET`   | `/api/settings/items`                                      | List canonical items for settings maintenance.                        |
| `PATCH` | `/api/settings/items/:itemId`                              | Edit canonical item name, default unit, or default category.          |
| `DELETE`| `/api/settings/items/:itemId`                              | Delete a canonical item and associated references.                    |
| `POST`  | `/api/settings/items/:itemId/merge`                        | Merge one canonical item into another.                                |
| `GET`   | `/api/settings/categories`                                 | List household item categories with usage counts.                     |
| `POST`  | `/api/settings/categories`                                 | Create a household item category.                                     |
| `PATCH` | `/api/settings/categories/:categoryId`                     | Rename a household item category.                                     |
| `DELETE`| `/api/settings/categories/:categoryId`                     | Delete a category and clear item/list-item references.                |
| `POST`  | `/api/settings/categories/:categoryId/merge`               | Merge one category into another.                                      |
| `POST`  | `/api/settings/clear-data`                                 | Hard-delete household app data and reseed defaults.                   |
| `GET`   | `/api/settings/stats`                                      | Return household usage stats.                                         |
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

Domain write routes update audit fields. List-item PATCH accepts `listId`, `name`, `categoryId`,
`amount`, `unit`, and `note`; moving to another list appends the item at the target list's next
visible position. Grouped list-item reorder accepts category groups and updates list-item
categories without changing canonical item categories. Lists, recipes, and list items use
status-based soft deletion. Recipe items and meal-planner placeholder ingredients are hard-deleted
because they are volatile child/draft data.

## Admin User Seed

The build runs a Nuxt `build:done` hook that calls `scripts/seed-admin-user.mjs`.

The seed reads `ADMIN_USER_EMAIL`, `ADMIN_USER_PASSWORD`, `ADMIN_API_KEY`, and
`NUXT_PUBLIC_SITE_URL` from the environment. It checks whether that email already exists by calling
`GET /api/users?email=<email>&limit=1`, then creates the user with `POST /api/users` if missing.

Both requests use `x-api-token: ADMIN_API_KEY`, so the seed can run against the current instance or
a remote deployment URL.

If the configured instance is unreachable during build, the seed logs a warning and skips without
failing the build.

When both `ENABLE_MULTI_TENANCY=true` and `ENABLE_PUBLIC_REGISTRATION=true`, the seed skips the
legacy initial admin user because public registration owns first-user/first-household creation.

The deployment workflow sets `SKIP_ADMIN_SEED=1` during build and runs `pnpm seed:admin` after
migrations and deployment complete.
