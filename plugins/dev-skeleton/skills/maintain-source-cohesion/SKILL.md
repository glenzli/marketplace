---
name: maintain-source-cohesion
description: Judge semantic ownership when adding an independent responsibility, separating mixed responsibilities, or moving production code or tests across ownership boundaries. Skip routine edits that leave those boundaries intact.
---

# Maintain Source Cohesion

Optimize for clear ownership and task-local context. A semantic owner is the module, component,
type, or package responsible for a behavior's state, mutation authority, lifecycle, invariants,
and failure policy.

## Orient

Use the nearest `SKELETON.md` for stable boundaries and navigation, falling back to
`DEV_SKELETON.md` in legacy repositories. Reuse orientation already read in this task unless it
changed or the work enters a new subsystem. Verify implementation facts in the relevant source.

## Judge the Boundary

- Keep a large owner when it represents one cohesive domain, pipeline, ABI, or consistency boundary.
  Size, churn, contention, and reading cost are investigation signals, not split criteria.
- Reconsider ownership when independent lifecycles or failure policies share a hub, unrelated work
  repeatedly changes the same owner, or a normal change requires understanding distant concerns.
- Extend the current owner when behavior shares its state and invariants. Give an independent new
  responsibility its own owner when its boundary is clear.
- Extract the smallest complete responsibility that helps the requested change. If concurrency,
  migration risk, or an unstable contract makes extraction unsafe, use narrow temporary wiring and
  explain the deferred boundary only when it helps future work.
- Keep atomic updates across models, caches, and projections with their consistency and rollback
  owner, even when the data crosses several nouns or layers.

## Move a Complete Responsibility

- Move state, helpers, lifecycle policy, public declarations, and focused tests together. Preserve
  behavior during a structural move when practical before adding behavior through the new boundary.
- Use a responsibility name and a concrete reason the owner could evolve independently. Avoid
  fragments that always change together and wrappers that leave behavior in the old hub.
- Keep entries and facades focused on composition, compatibility, and shared lifecycle coordination.
  Let implementations consume direct dependencies instead of an umbrella or lexical prelude.
- Inspect call sites before promoting shared validation, conversion, serialization, or policy;
  establish one canonical owner rather than spreading duplicate implementations.
- Remove obsolete implementations and navigation edges owned by the change. Update `SKELETON.md`
  only when a stable responsibility or route changes; a short responsibility description is enough.
  Add a nested skeleton only when existing source entries cannot make a large subsystem navigable.

## Preserve the Affected Contracts

- Preserve public APIs, reachable signature types, schemas, ABI, serialization, ordering, numeric
  behavior, and identity unless the task changes them.
- Keep private-invariant tests with their owner and cross-owner tests at the real integration
  boundary. Move test registration and prerequisites with the suite; keep fixtures narrow until reused.
- Keep production internals private and test production logic directly rather than copying it.
- Update build, packaging, binding, and registration graphs that consume a moved component.
  Source, test, and packaged runtime reachability are distinct facts.
- Run focused owner and affected cross-owner checks. Build the affected production and test targets
  when dependency boundaries move; exercise a linked or packaged consumer when compilation alone
  cannot prove reachability. Check compatibility fixtures for the properties the move could alter.
- For a mechanical split with omission risk, compare named declarations, tests, or registrations;
  equal totals alone do not prove preservation.

## Load Guidance for the Changed Boundary

- [async-ui.md](references/async-ui.md): moving asynchronous lifecycle, state projection, gesture,
  localization, or packaged UI ownership.
- [native-cross-language.md](references/native-cross-language.md): changing ABI, FFI mappings,
  translation-unit or embedded-language ownership, generated bindings, or build registration.
- [large-payload-and-acceleration.md](references/large-payload-and-acceleration.md): changing buffer
  lifetime, cache identity, resource admission, execution paths, or preview geometry.
- [test-topology-and-migration.md](references/test-topology-and-migration.md): reorganizing mixed
  suites, test visibility, runner reachability, or a repository-defined topology migration.

Read only the relevant references and apply their checks to risks introduced by the change.
Technology presence alone is not a trigger. Keep exact layouts, commands, and broader validation
gates in the repository that owns them. Report a keep/extract/defer decision only when it explains
a non-obvious choice.
