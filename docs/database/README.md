# Database

## Active Schema

The database schema is defined in `server/db/schema.ts` and managed with NuxtHub/Drizzle
migrations under `server/db/migrations/sqlite/`.

Existing tables:

- `users`

Domain tables added for Pantry Panic:

- `lists`
- `items`
- `recipes`
- `recipe_items`
- `list_items`
- `meal_planner_days`
- `meal_planner_day_items`

Domain tables use text primary keys generated with the `uuid` package's UUID v7 helper.

## Enum Constants

The schema exports these enum value constants:

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

`items` stores canonical grocery items. The `normalized_name` unique index supports reuse and
autocomplete.

`recipes` stores reusable recipe templates.

`recipe_items` stores ordered recipe ingredients.

`list_items` stores concrete item occurrences on a shopping list. Duplicates are allowed and
history is preserved through statuses rather than hard deletion.

`meal_planner_days` stores the singleton seven-day meal planner.

`meal_planner_day_items` stores volatile placeholder meal ingredients. These rows may be hard
deleted when planner days are reset or changed.

## Seed Data

Migration `0001_worried_jasper_sitwell.sql` seeds default domain data when at least one user
already exists:

- one active list using `runtimeConfig.pantry.defaultListName`
- seven `meal_planner_days` rows with `type = empty`

For fresh deployments where migrations run before the first user exists, `createUser()` calls
`seedInitialDomainData(user.id)` after creating the user. This covers the HTTP admin seed path.

## Helpers

Low-level helpers live in `server/utils/`:

- `createDomainId()` creates UUID v7 ids through the `uuid` package.
- `normalizeItemName()` trims, lowercases, and collapses whitespace.
- `findItemByNormalizedName()` fetches canonical items by normalized name.
- `findOrCreateItem()` implements canonical item reuse.
- `seedInitialDomainData()` creates missing default list and meal-planner rows.
- `getFirstUserIdForDomainSeed()` returns a seed audit user when one exists.

## Deviations From Prompt

- Audit user columns are integer foreign keys, not text, because the existing `users.id` column is
  integer and must be reused.
- New domain database columns use snake_case names while TypeScript properties remain camelCase.
- Seed data is implemented both in migration SQL and in the user creation helper so existing and
  fresh deployments are both covered.
