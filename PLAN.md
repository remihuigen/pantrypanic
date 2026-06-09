# Pantry Panic

> The list manager that doesn't suck.

## Overview

Pantry Panic is a private, installable grocery list application built for small households.

The project exists because most grocery and shopping list applications are either overly complex,
bloated with features, locked behind subscriptions, or frustrating to use for everyday shopping.

Pantry Panic focuses on one thing:

**making it fast and painless to manage shared grocery lists.**

The application is designed primarily for two users sharing the same household, but the architecture
should remain flexible enough to support additional users in the future.

---

## Core Principles

### Simplicity First

The application should solve grocery list management exceptionally well before introducing
additional functionality.

Features should only be added when they clearly improve the shopping workflow.

### History is Valuable

Shopping history is a first-class feature.

Items are never permanently removed from the system. Instead, records move through lifecycle states
such as archived and deleted.

This historical data powers:

- Autocomplete
- Frequently used items
- Recently purchased items
- Shopping patterns
- Future recommendation features

### Lists are Reusable

Lists are intended to be long-lived containers.

Instead of creating a new grocery list every week, users continuously reuse the same list.

When a shopping trip is complete, the list is cleared by archiving its items rather than deleting
them.

### Recipes are Templates

Recipes act as reusable templates.

Adding a recipe to a list creates new list item records.

Recipe changes never modify existing grocery lists.

### Fast Mobile Experience

The primary interface is mobile.

The most common actions should require as few taps as possible:

1. Open app
2. Add item
3. Check item
4. Clear list

---

# Technology Stack

## Frontend

- Nuxt 4
- Vue 3
- TypeScript
- Nuxt UI
- Tailwind CSS 4
- Pinia
- VueUse

## Backend

- Nitro Server
- Cloudflare Workers
- Cloudflare D1
- Drizzle ORM
- Zod v4

## Infrastructure

- NuxtHub
- Cloudflare
- PWA support

---

# Domain Model

## Lists

Reusable containers for shopping items.

Examples:

- Groceries
- Hardware Store
- Drugstore
- Camping Trip

Lists support:

- Manual ordering
- Archive
- Soft delete

---

## Items

Canonical products or shopping concepts.

Examples:

- Milk
- Eggs
- Bread
- Tomatoes

Items are normalized and reused across recipes and lists.

---

## List Items

Occurrences of items inside a list.

List items may contain duplicates.

This is intentional and contributes to usage statistics and historical tracking.

Status lifecycle:

```txt
unchecked
  ↓
checked
  ↓
archived
```

Items may also be marked as:

```txt
deleted
```

Deleted items are excluded from analytics.

---

## Recipes

Reusable collections of ingredients.

Recipes are templates only.

Adding a recipe to a list creates new list item records.

---

# Authentication

The MVP uses simple cookie-based authentication.

Characteristics:

- No registration
- No onboarding
- No password reset
- Predefined users
- Session-based authentication

Authentication exists only to ensure users are known and actions can be attributed.

---

# Realtime Strategy

The application uses polling instead of WebSockets.

Reasons:

- Simpler architecture
- Lower operational complexity
- Sufficient for household usage
- Easy Cloudflare deployment

Clients periodically refresh list data while the application is active.

---

# Sorting

Manual ordering is a core feature.

Users can reorder:

- Lists
- List items
- Recipe ingredients

Drag-and-drop functionality is implemented using:

```ts
useSortable()
```

from VueUse.

Ordering is stored in the database and synchronized across all users.

---

# MVP Features

## Authentication

- Login
- Logout
- Session persistence

## Lists

- Create list
- Rename list
- Reorder lists
- Archive list
- Delete list

## List Items

- Add item
- Autocomplete item
- Check item
- Uncheck item
- Delete item
- Reorder items
- Clear list

## Recipes

- Create recipe
- Edit recipe
- Reorder ingredients
- Add recipe to list

## PWA

- Installable
- Mobile-first
- Responsive

---

# Future Ideas

These are intentionally out of scope for the MVP.

- Barcode scanning
- Store-specific sorting
- Push notifications
- Price tracking
- Meal planning
- Household invitations
- Shared households
- Offline synchronization
- AI-powered shopping recommendations
- Pantry inventory tracking

---

# Success Criteria

The project is considered successful when:

- Two users can share the same grocery list.
- Adding items is faster than using existing grocery apps.
- Frequently purchased items are easy to re-add.
- Lists can be reused indefinitely.
- Recipes can quickly populate shopping lists.
- The application feels lightweight, fast, and enjoyable to use.

If users stop thinking about the app and simply use it while shopping, Pantry Panic has achieved its
goal.
