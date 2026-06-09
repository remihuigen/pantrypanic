# Documentation Sync Rule

## Core Policy

- `README.md` and `docs/` are for humans.
- `.agents/` is for agents.
- Active implementation facts should exist in both human and agent-facing docs.

## Mandatory Rule

Do not update one side with active implementation facts while leaving the mirror side stale.

## Mirror Map

- `README.md` <-> `.agents/context/project-overview.md`
- `docs/config/README.md` <-> `.agents/context/runtime-and-deployment.md`
- `docs/server/README.md` <-> `.agents/context/runtime-and-deployment.md`
- database schema and migrations <-> `.agents/context/database.md`
- `AGENTS.md` <-> `.agents/rules/operational-contract.md`
- `PLAN.md` <-> `.agents/context/project-overview.md`

## Skills Boundary

Installed skills are treated as external dependencies.

- Do not modify `.agents/skills/**` in normal documentation sync work.
- Only touch skills when explicitly requested.
