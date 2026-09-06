# Large Payload And Acceleration Boundaries

Use the relevant sections when changing buffer lifetime, cache identity, resource admission,
execution paths, or preview geometry for large payloads.

## Own The Payload Lifecycle

- Treat allocation, ownership, format, dimensions, stride, color or sample interpretation,
  synchronization, and release as one payload contract.
- Budget copies across the full producer-to-consumer path. Removing one obvious copy is not useful
  if encoding, bridge conversion, upload, or presentation immediately recreates it.
- Let zero-copy views borrow from a stable owner whose lifetime is explicit. A pointer plus length
  is not an ownership model.
- Keep immutable source data separate from mutable working state and presentation caches. Make each
  invalidation boundary name the identity it invalidates.
- Use byte or resource cost for admission and eviction, then enforce aggregate resident limits.
  Entry count alone does not bound memory when payload dimensions vary.
- Keep visibility, readiness, and residency distinct. Something may be visible but backed by stale
  data, ready but not admitted to memory, or resident but no longer current.

## Prepare Execution Once

- When planning and execution depend on the same parameters, prepare one opaque plan containing
  normalized inputs, chosen path, resource requirements, and provenance.
- Make query, cache lookup, scheduling, and execution consume that same plan. Re-deriving decisions
  independently creates capability and cache-key drift.
- Keep fallback selection and accelerated execution behind one semantic contract. Record which path
  produced an output so failures and performance regressions remain diagnosable.
- Keep portable fallback algorithms outside optional third-party adapters, and validate both
  dependency-present and dependency-absent builds.
- Cache compiled or prepared resources by their complete semantic identity, not a convenient subset
  of visible parameters.

## Preserve Authored Topology When Present

Apply this section only when a payload derives from authored continuous geometry or time-domain intent.

- Model authored input as paths, regions, envelopes, kernels, or other semantic primitives before
  sampling it into execution-specific points, frames, or tiles.
- Keep coordinate transforms explicit and invariant across preview scale, full resolution, tiles,
  crop, orientation, and display projection.
- Define overlap and boundary policy with the algorithm owner. Tiling must not introduce seams,
  truncate support regions, or change edge behavior.
- Keep sampling density an execution detail derived from scale and support radius, not persisted
  user intent unless the product contract explicitly requires it.

## Measure The Final Consumer

When the change could affect resource use or performance, measure the affected path through its
final consumer. Reuse existing measurements and diagnostics where their inputs remain valid.

- Select metrics for the risk: copies and peak memory for ownership changes; first-use and warm
  latency for execution changes; cancellation delay and stale results for scheduling changes.
- Separate preparation, execution, transfer, and presentation timing when locating a bottleneck.
  Kernel time alone cannot establish interactive performance.
- Keep any added diagnostics bounded. Do not introduce a full metric matrix for a mechanical move.

## Validate Parity And Pressure

- Exercise portable checks for changed coordinate math, plan identity, admission, eviction,
  cancellation, or fallback behavior.
- When accelerated algorithms or execution paths change, compare representative outputs on real
  hardware with an accepted reference and domain-appropriate tolerances. Include the edge cases the
  change could affect, such as tile borders or odd dimensions.
- When lifetime, admission, or invalidation changes, exercise relevant pressure, supersession,
  scale-change, or resource-loss cases. Check stale-work rejection and memory recovery.
- Broader hardware and performance matrices belong to the repository's validation policy.
