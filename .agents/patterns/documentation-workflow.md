# Documentation Workflow (Agent)

Use this flow for documentation updates:

1. Classify docs as human-facing vs agent-facing.
2. Keep human narrative in `docs/`.
3. Keep operational instructions in `.agents/`.
4. Mirror active facts across both locations.
5. Remove obsolete docs instead of leaving stale references.
6. Preserve the skills boundary:
   - do not edit `.agents/skills/**` unless explicitly requested.
