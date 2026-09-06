---
name: skeleton-audit
description: Audit repository skeletons and AGENTS.md for stale claims, excessive detail, unclear source authority, and unnecessary ceremony. Use for an explicit skeleton audit, not a general code review. Supports legacy DEV_SKELETON.md.
---

# Skeleton Audit

Audit skeletons as orientation, not source documentation.

## Resolve Inputs

1. Use `SKELETON.md` when it exists.
2. Otherwise audit `DEV_SKELETON.md` as the legacy orientation file.
3. If neither exists, report the missing orientation contract; do not apply the remaining checks to
   an imagined file.
4. Treat the legacy filename as a migration opportunity, not as evidence that its content is wrong.

## Check

Check whether important project information is missing or misleading, not whether template headings
are present. Sections may be omitted or merged; report missing guidance only with its practical cost.

- Does the resolved orientation file explain the project boundary, source authority, durable priors
  or invariants, and refresh boundary?
- Does `REVIEW_SKELETON.md` state the project's review priorities, known red lines, and relevant
  verification expectations? Include recurring risk patterns when they add distinct guidance.
- Does `AGENTS.md` tell agents to verify facts against source?
- Are project-defining red lines visible in `Block`, not only risk patterns?
- Can an unfamiliar maintainer reach the likely subsystem or owner in one or two navigation hops?
- Does the semantic map contain stable concerns and boundaries rather than a current module inventory?
- Is each nested `SKELETON.md` justified by real subsystem complexity rather than document symmetry?
- Is README free to serve its actual audience instead of being forced to carry internal navigation?
- Do refresh triggers exclude routine implementation changes?
- Does any file describe current implementation that should be read from source? A short stable
  responsibility description that routes readers to an owner is useful navigation.
- Does any file imply skeleton content is authoritative?
- Are claims grounded in maintained project files?
- Do instructions provide useful priors without forcing mechanical classifications, reports, or ceremonies?

## Output

Lead with findings. For each issue, cite the file and say whether to delete, shorten, or reframe.

Do not ask the user to build deterministic tooling unless a repeated failure shows prompt-only audit is insufficient.
