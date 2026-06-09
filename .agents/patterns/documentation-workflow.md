# Documentation Workflow (Agent)

Use this flow for documentation updates:

1. Inspect the codebase first.
2. Read `PLAN.md` for product direction, but do not treat planned features as implemented.
3. Classify docs as human-facing (`README.md`, `docs/`) or agent-facing (`.agents/`).
4. Keep human narrative in `README.md` and `docs/`.
5. Keep operational instructions and implementation facts in `.agents/`.
6. Mirror active facts across both locations.
7. Remove obsolete references instead of leaving stale breadcrumbs.
8. Preserve the skills boundary:
   - do not edit `.agents/skills/**` unless explicitly requested.
