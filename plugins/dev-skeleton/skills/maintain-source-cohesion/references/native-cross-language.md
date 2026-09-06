# Native And Cross-Language Boundaries

Use the relevant sections when changing ABI, FFI mappings, translation-unit ownership, embedded
language ownership, generated bindings, or build registration.

## Preserve Public Contracts

- Keep a centralized declarative ABI, wire schema, or ordered variant registry together when its
  namespace, field order, membership, generated header, or type identity is the auditable contract.
  Extract behavior-rich conversion and lifecycle policy behind it instead of fragmenting declarations.
- Treat PIMPL, opaque storage, a namespace, or one facade class as encapsulation, not proof of
  cohesion. Inventory protocol families, lifecycles, and consumer fan-out.
- When splitting an interleaved public hub, account for its types, functions, overloads, aliases,
  constants, and forward declarations so none lose their intended owner or visibility.
- Audit every type in public signatures after a move. Requests, results, errors, callbacks, and
  aliases must remain nameable through the intended public surface.
- Use declarations without definitions only where the language safely permits incomplete types.
  Require complete owners for by-value state, variants, optionals, and inline behavior.
- Keep a complete sum type with the family it closes over when ordering or membership affects
  persistence, ABI, wire identity, or exhaustive dispatch.
- Let the owner of a complete sum type also own exhaustive dispatch and representation-specific
  validation. Do not make every workflow reopen the aggregate with parallel visits.

## Complete Compilation Ownership

- Move declarations, out-of-line implementation, private helpers, and focused validation to the
  same semantic owner.
- Expose the smallest responsibility-named internal contract between translation units. Do not
  recreate a hub as `internal`, `common`, or `helpers`.
- Re-audit linkage when file-local or anonymous-namespace helpers become cross-unit operations.
  Qualify exported names and keep implementation mechanics private.
- Re-audit relative visibility after adding a module or namespace level. Package-private,
  `protected`, friendship, and parent-relative visibility describe positions in the old tree.
- Require every new production unit to compile from direct includes or imports without declaration
  order, textual include tricks, umbrella preludes, or transitive dependencies.
- Keep compatibility or umbrella headers as stable public indexes when needed, but make production
  implementations consume narrow responsibility-named headers.
- Treat an embedded shader, SQL program, generated-language block, or other independently evolving
  DSL as its own language owner even when hosted in one native source file.

## Own Bridge Contracts

- Give a large bidirectional bridge mapping one projection owner before splitting workflows around
  it. Cover nested identities, bounded collections, optional fields, geometry, and history metadata.
- Give cross-language values explicit presence and units. Do not let default values hide fields that
  one route forgot to populate.
- Keep structural boundary validation separate from route-dependent capability negotiation. The
  selected backend owns executability and provider policy.

## Validate Affected Build and Consumer Contracts

- Update every explicit source list, generated-binding dependency, rerun manifest, IDE project,
  packaging target, and registration table that consumes the moved unit.
- When changing source registration, check that compilation and dependency tracking cover the same
  units in each affected graph. Reuse maintained manifest checks; do not introduce enforcement
  tooling solely for a structural move.
- Link through affected graphs when object inclusion or linkage changes. Use a clean build when
  stale objects could mask the change and incremental evidence cannot rule that out.
- Link at least one real consumer after adding a native unit behind a language bridge. Type checking
  and compile-only validation cannot expose an omitted object file.
- When DTO or codec mappings change, exercise a production-linked contract check at the mapping layer.
  Lower-level tests do not prove optionality, units, enum values, identities, and every field survive
  the host projection.
- For serialization, hashing, content addressing, or identity moves, compare canonical bytes and
  stable digest fixtures, not only behavioral equivalence.
- For public-hub splits with omission risk, compare declaration or symbol multisets before and after.
  Distinguish definitions from intentional forward declarations.
