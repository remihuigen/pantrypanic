# Agent Knowledge Base

This directory contains agent-facing operational knowledge for this repository.

Policy mirror:

- `docs/` is for humans.
- `.agents/` is for agents.
- Active information must exist in both places.

## Structure

- `context/` project/runtime context for task orientation
- `rules/` hard constraints and policy
- `patterns/` execution playbooks
- `skills/` installed skill packs

## Important Rule

Do not edit anything under `.agents/skills/**` unless explicitly requested.

## Suggested Read Order

1. `rules/operational-contract.md`
2. `context/project-overview.md`
3. `context/content-and-routes.md`
4. `context/runtime-and-deployment.md`
5. `patterns/change-workflow.md`
6. `rules/documentation-sync.md`

## Human Mirror Links

- `../README.md`
- `../docs/README.md`
- `../docs/conventions/README.md`
- `../docs/content/README.md`
- `../docs/ci-cd/README.md`
