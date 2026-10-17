---
name: skeleton-refresh
description: Update existing repository orientation when durable intent, source authority, ownership, navigation, constraints, or review priorities change; also migrate legacy DEV_SKELETON.md. Skip first-time initialization and routine implementation edits.
---

# Skeleton Refresh

Update only durable orientation, preserving a design record's separate purpose.

Prefer `SKELETON.md`, otherwise legacy `DEV_SKELETON.md` or the repository's declared orientation
entry. If none exists, report the gap; use `skeleton-init` when adoption is in scope. Do not create
a competing map just to match a filename.

## Refresh For

- Project purpose or non-goals.
- Runtime, platform, or release boundaries.
- Source-of-truth files or artifact categories.
- Stable domain assumptions.
- Durable semantic ownership, subsystem entries, or navigation expectations.
- Review priorities or red lines.

Skip routine refactors, renamed helpers, internal implementation movement, and test churn when the
stable owner and navigation path did not change.
If only current implementation details changed, leave skeletons unchanged.

1. Migrate legacy `DEV_SKELETON.md` only when modernization is in scope, removing the superseded
   copy rather than maintaining both indefinitely.
2. Inspect the source-of-truth files relevant to the claimed change.
3. Remove stale detail in the affected guidance before adding new detail.
4. When a stable owner or route changes, update its map entry or add one concise route. Keep current
   feature status, execution flows, and version constants in their maintained source.
5. Add a nested `SKELETON.md` only when a large subsystem cannot be navigated locally in one or two hops.
6. Keep the result compact; omit or merge sections without distinct project information.
7. Mark uncertainty instead of hard-coding guesses.

## Finish Check

Read the result as a whole: it should route to source without accumulating an implementation history.
