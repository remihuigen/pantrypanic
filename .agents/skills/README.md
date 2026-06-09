# Skills Knowledge

`skills/` contains reusable tooling knowledge and task-specific execution packs.

## Purpose

- Capture framework/tool expertise that can be applied repeatedly.
- Keep references close to runnable agent workflows.
- Avoid re-documenting the same tool details in each task.

## Current Coverage

This repository currently includes skills for:

- Nuxt and Nuxt UI
- Vue and Vue testing best practices
- Pinia
- Vitest
- pnpm
- Zod
- AI SDK
- VueUse function references

## Usage Pattern

1. Select the relevant skill directory.
2. Read `SKILL.md` first.
3. Use local `references/` material for implementation details.
4. Apply repository constraints from `../rules/operational-contract.md` and
   `../rules/documentation-sync.md`.

## Sync Rule

When a human doc change materially affects tooling usage, update the relevant skill or add a pointer
from this index.
