# Project Skeleton

Orientation only. Verify implementation facts against authoritative project artifacts.
Keep sections with distinct project information; omit or merge the rest.

## Purpose and Boundaries

Why this project exists, what it intentionally does not do, and any scope boundary an unfamiliar
maintainer should know before reading source.

## Source Authority

Name authoritative artifact categories such as source, tests, configuration, schemas, generated
outputs, release artifacts, or maintained public documentation.

## Repository Map

Include a map when it helps navigation. Pair stable concerns with source entries and short
responsibility descriptions; do not inventory modules or summarize their current implementation.

| Concern | Stable entry | Ownership boundary |
| --- | --- | --- |
| Example concern | `path/to/entry` | Durable responsibility, not an implementation summary |

Route readers to an owner through stable source entries. Add a nested `SKELETON.md` only when a
large subsystem cannot be navigated clearly through those entries alone.

## Architectural Priors and Invariants

Record durable choices, their tradeoffs, and constraints future work must preserve. Distinguish
required invariants from preferences that depend on context. Omit mechanics visible in source.

## Refresh Boundary

Update this file when durable purpose, boundaries, authority, ownership, navigation, invariants, or
architectural priors change. Routine implementation changes should not update it.
