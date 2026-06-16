# Database

## Active Schema

The database schema is defined in `server/db/schema.ts` and managed with NuxtHub/Drizzle
migrations under `server/db/migrations/sqlite/`.

Existing tables:

- `users`
- `households`
- `household_users`
- `household_settings`
- `access_links`

Domain tables added for Pantry Panic:

- `lists`
- `item_categories`
- `list_category_positions`
- `items`
- `recipes`
- `recipe_items`
- `list_items`
- `meal_planner_days`
- `meal_planner_day_items`

Domain tables use text primary keys generated with the `uuid` package's UUID v7 helper.

## Enum Constants

The schema exports these enum value constants:

- `householdUserRoleValues`: `member`, `householdOwner`
- `listStatusValues`: `active`, `archived`, `deleted`
- `listItemStatusValues`: `unchecked`, `checked`, `archived`, `deleted`
- `recipeStatusValues`: `active`, `archived`, `deleted`
- `listItemSourceTypeValues`: `manual`, `recipe`, `meal_planner_recipe`, `meal_planner_placeholder`
- `mealPlannerDayTypeValues`: `empty`, `recipe`, `placeholder`

## Audit Columns

Every domain table includes:

- `created_at`
- `updated_at`
- `created_by_user_id`
- `updated_by_user_id`

Lifecycle fields on `list_items` also reference users for checked, archived, and deleted events.

Because the existing `users.id` column is an integer, all domain audit user references are integer
foreign keys.

## Table Purposes

`lists` stores reusable shopping lists. The seeded list name comes from
`runtimeConfig.pantry.defaultListName` and defaults to `Boodschappen`.

`households` stores household/tenant containers. `household_users` stores memberships and each
membership's `member` or `householdOwner` role. `household_settings` stores household-wide app
settings such as refresh interval. `access_links` stores hashed one-time invite and reset-access
tokens.

`items` stores canonical grocery items. The household + `normalized_name` unique index supports
reuse and autocomplete within a household. `items.category_id` stores the canonical default
category used when creating future list-item occurrences from that item.

`item_categories` stores household-scoped grocery categories. Category names are unique per
household by normalized name.

`list_category_positions` stores list-specific ordering for named categories.
`lists.uncategorized_category_position` stores the special list-specific order slot for the
uncategorized group. Dragging items between category groups updates the list-item category and this
list-level category order; it does not change the canonical item category.

`recipes` stores reusable recipe templates and source metadata. Top-level recipe notes are no
longer stored.

`recipe_items` stores ordered recipe ingredients.

`list_items` stores concrete item occurrences on a shopping list. Duplicates are allowed and
history is preserved through statuses rather than hard deletion. `list_items.category_id` is the
occurrence category used for grouped shopping-list views.

`meal_planner_days` stores one seven-day meal planner per household.

`meal_planner_day_items` stores volatile placeholder meal ingredients. These rows may be hard
deleted when planner days are reset or changed.

## Seed Data

Migrations seed/backfill default household and domain data when at least one user already exists:

- one default household named `Thuis`
- household-owner membership rows for existing users
- one active list per household using `runtimeConfig.pantry.defaultListName`
- seven `meal_planner_days` rows per household with `type = empty`

For fresh deployments where migrations run before the first user exists, `createUser()` creates the
default household, attaches the user, and calls `seedInitialDomainData()` for that household. This
covers the HTTP admin seed path.

## Helpers

Low-level helpers live in `server/utils/`:

- `createDomainId()` creates UUID v7 ids through the `uuid` package.
- `normalizeItemName()` trims, lowercases, and collapses whitespace.
- `normalizeCategoryName()` trims, lowercases, and collapses whitespace for category uniqueness.
- `findItemByNormalizedName()` fetches canonical items by normalized name.
- `findOrCreateItem()` implements canonical item reuse.
- Settings canonical-item deletion hard-deletes associated list, recipe-item, and meal-planner-day
  item references before deleting the item row.
- `seedInitialDomainData()` creates missing default list and meal-planner rows.
- `getFirstUserIdForDomainSeed()` returns a seed audit user when one exists.

## Deviations From Prompt

- Audit user columns are integer foreign keys, not text, because the existing `users.id` column is
  integer and must be reused.
- New domain database columns use snake_case names while TypeScript properties remain camelCase.
- Seed data is implemented both in migration SQL and in the user creation helper so existing and
  fresh deployments are both covered.
