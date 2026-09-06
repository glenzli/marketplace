---
name: skeleton-init
description: Initialize SKELETON.md, REVIEW_SKELETON.md, and AGENTS.md for a repository adopting dev-skeleton, or replace an explicitly selected context setup. Use skeleton-refresh for existing orientation or legacy migration.
---

# Skeleton Init

Create three compact orientation files, not a knowledge base or workflow system.

## Boundary

- If `SKELETON.md` already exists, use `skeleton-refresh` unless the user explicitly requests a full
  reinitialization.
- If only `DEV_SKELETON.md` exists, use `skeleton-refresh` to migrate its durable content.
- Preserve an existing `REVIEW_SKELETON.md` or `AGENTS.md` unless replacing it is explicitly in scope.

## Use Maintained Templates

Read the maintained [SKELETON.md template](../../templates/SKELETON.md),
[REVIEW_SKELETON.md template](../../templates/REVIEW_SKELETON.md), and
[AGENTS.md template](../../templates/AGENTS.md) before writing. Treat them as adaptable output
assets, not project facts. If these bundle-level templates are unavailable, report an incomplete
dev-skeleton distribution instead of synthesizing a competing template contract.

Omit or merge sections without distinct project information. Do not invent principles or fill
headings for completeness; templates suggest content, not a required document shape.

## Do

1. Inspect the authoritative files needed to establish the project's boundaries and stable entries.
   Follow relevant source, configuration, tests, or maintained documentation; do not survey every
   artifact category by default.
2. Capture durable orientation: purpose and boundaries, source authority, architectural priors,
   invariants, review priorities, and core red lines.
3. Add a bounded semantic map when it materially shortens navigation. Map stable concerns to entry
   points and ownership boundaries. A one-sentence stable responsibility description is useful;
   do not inventory the tree or describe how each module currently works.
4. Create the missing canonical files:
   - `SKELETON.md`
   - `REVIEW_SKELETON.md`
   - `AGENTS.md`
5. Keep README independent. It may be a useful source, but it is not required to own internal navigation.
6. Mark uncertainty instead of inventing intent.

## Never Include

- Per-function, class, API, or module implementation summaries.
- Architecture mirrors, call graphs, generated or exhaustive source indexes, or test inventories.
- Function-level entry hints.
- Behavior that should be read from current source.

## Finish Check

Every durable claim must be grounded in an authoritative file or marked as uncertain.
Routine implementation changes should not require skeleton updates.
