# Agent Knowledge Base

This directory contains agent-facing operational knowledge for Pantry Panic.

Policy mirror:

- `README.md` and `docs/` are for humans.
- `.agents/` is for agents.
- Active implementation facts should be mirrored between the human and agent docs.

## Important Rule

Do not edit anything under `.agents/skills/**` unless the user explicitly asks for skill changes.

## Current Codebase Summary

- Product direction: private, installable grocery list app for small households.
- Planning source: `PLAN.md`.
- Current UI: mostly Nuxt UI starter pages plus login/logout pages; Pantry Panic product UI is not implemented yet.
- Current backend: session auth, user CRUD, blob CRUD/validation, Pantry Panic domain APIs, image serving, and HTTP admin-user seeding.
- Current deployment: GitHub Actions deploys Cloudflare Workers after applying D1 migrations.
- Current database: `users` plus Pantry Panic domain tables for lists, items, recipes, list items, and meal planner data.
- Current tests: Vitest covers TypeScript/JavaScript logic under `server/utils` and `scripts` with coverage thresholds.

## Structure

- `context/` contains implementation facts and runtime state.
- `rules/` contains hard constraints for agent changes.
- `patterns/` contains recurring documentation/change workflows.
- `skills/` contains installed skill packs and must not be edited by default.

## Suggested Read Order

1. `rules/operational-contract.md`
2. `context/project-overview.md`
3. `context/runtime-and-deployment.md`
4. `context/database.md`
5. `patterns/documentation-workflow.md`
6. `rules/documentation-sync.md`

## Human Mirror Links

- `../README.md`
- `../docs/README.md`
- `../docs/config/README.md`
- `../docs/server/README.md`
- `../PLAN.md`
