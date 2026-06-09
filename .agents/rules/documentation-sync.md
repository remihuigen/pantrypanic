# Documentation Sync Rule

## Core Policy

- `docs/` is for humans.
- `.agents/` is for agents.
- Active information must exist in both places.

## Mandatory Rule

Do not update one side without updating the mirror side in the same change.

## Mirror Map

- `README.md` <-> `.agents/context/project-overview.md`
- `docs/content/README.md` <-> `.agents/context/content-and-routes.md`
- `docs/config/README.md` + `docs/ci-cd/README.md` <-> `.agents/context/runtime-and-deployment.md`
- `AGENTS.md` + `docs/conventions/README.md` <-> `.agents/rules/operational-contract.md`
- `docs/agent-guide/README.md` <-> `.agents/README.md` + `.agents/patterns/*`

## Skills Boundary

Installed skills are treated as external dependencies.

- Do not modify `.agents/skills/**` in normal documentation sync work.
- Only touch skills when explicitly requested.
