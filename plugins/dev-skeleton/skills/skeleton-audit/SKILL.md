---
name: skeleton-audit
description: Audit repository orientation for stale claims, excessive detail, unclear source authority, and unnecessary ceremony. Use for an explicit skeleton audit, not a general code review. Recognize canonical, legacy, or repository-declared navigation.
---

# Skeleton Audit

Audit skeletons as orientation, not source documentation.

## Resolve Inputs

1. Prefer `SKELETON.md`, otherwise legacy `DEV_SKELETON.md`.
2. If neither exists, follow the repository's declared orientation entry, such as `AGENTS.md` and
   its design record or architecture map. If no entry exists, report the gap; do not invent one to audit.
3. Treat filenames as conventions. Audit orientation content, respecting a design record's separate
   purpose; recommend adoption or migration only for a concrete navigation or maintenance problem.

## Check

Check whether important project information is missing or misleading, not whether template headings
are present. Sections may be omitted or merged; report missing guidance only with its practical cost.

- Does the existing orientation explain the project boundary, source authority, durable priors
  or invariants, and refresh boundary?
- Does maintained review guidance state the project's review priorities, known red lines, and relevant
  verification expectations? Include recurring risk patterns when they add distinct guidance.
- Does the agent guidance direct agents to verify facts against source?
- Are project-defining red lines explicit in `Block` or its local equivalent, not only risk patterns?
- Can an unfamiliar maintainer reach the likely subsystem or owner in one or two navigation hops?
- Does the semantic map contain stable concerns and boundaries rather than a current module inventory?
- Is each nested `SKELETON.md` justified by real subsystem complexity rather than document symmetry?
- Is README free to serve its actual audience instead of being forced to carry internal navigation?
- Do refresh triggers exclude routine implementation changes?
- Does orientation accumulate current mechanics, feature status, execution flows, or version constants?
  Keep stable responsibility descriptions and source routes; shorten accumulated detail.
- Does any file imply skeleton content is authoritative?
- Are claims grounded in maintained project files?
- Do instructions provide useful priors without forcing mechanical classifications, reports, or ceremonies?

## Output

Lead with findings. For each issue, cite the file and say whether to delete, shorten, or reframe.

Do not ask the user to build deterministic tooling unless a repeated failure shows prompt-only audit is insufficient.
