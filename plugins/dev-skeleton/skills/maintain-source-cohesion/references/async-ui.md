# Async And UI Boundaries

Use the relevant sections when changing asynchronous lifecycle, state projection, gesture,
localization, or packaged UI ownership.

## Own Complete Lifecycles

- Treat independently cancellable jobs, retries, watchers, task-result types, timers, and completion
  handlers as stronger boundary evidence than line count.
- Move the workflow's admission, identity, state, and terminal handling together, including progress,
  cancellation, retry, and destruction wait where supported. Moving only the worker call leaves the
  facade as the hidden lifecycle owner.
- Keep the visible affordance equivalent to the state machine's acceptance policy. An available
  action must be admitted atomically, rejected visibly, or queued; never let a shared task slot turn
  it into a silent no-op.
- Preserve queued intent across retryable or superseded background results. Clear it only at a named
  terminal failure, cancellation, identity change, or successful handoff.
- Let the facade arbitrate genuinely shared application lifecycle, but keep operation-specific
  pacing, counters, progress snapshots, and terminal policy with the operation.
- Keep consequential recovery choices with the failure they resolve. Retry, cancel, destructive
  bypass, resume, and exit authority form one recovery contract, not presentation alone.

## Own State Projections

- Keep asynchronous collection projection with its snapshot, query identity, stale-result rejection,
  and invalidation policy. Move selection, request scheduling, and terminal cleanup with the projection
  when it owns them.
- For batch mutations, keep input normalization, stable deduplication, backend request construction,
  partial-success projection, diagnostics, and downstream invalidation in one owner.
- When queries populate incompatible subsets of one value type, use responsibility-specific
  summary/detail contracts or explicit presence. Do not overload zero or empty values to mean both
  "not requested" and valid domain data.
- When several publishers share a visible status property, keep arbitration at the facade. Children
  own semantic messages and lifecycle events; the facade owns which message is currently visible.
- On locale changes, retranslate the currently selected message. Do not replay every child's cached
  status and let callback order become priority policy.
- Retranslate product-supplied display names, but preserve user-authored text byte-for-byte.

## Extract UI Components Completely

- Move a component with the state, interaction, trigger, geometry, and transient UI it owns.
- Keep anchored popups, overlays, menus, and inspectors with the trigger and coordinate conversion
  that place them.
- Extract direct manipulation as one gesture lifecycle: admission, coordinate normalization,
  drag/click classification, sampling, commit or cancel cleanup, and pointer affordance.
- Keep high-frequency gesture samples in ephemeral interaction state. Coalesce or throttle
  expensive preview work, and cross history, persistence, or authoritative model boundaries only
  at intentional checkpoints such as gesture completion.
- Treat readiness at pointer admission as permission to start, not a recurring condition that can
  silently revoke an active capture. Finish or explicitly cancel the admitted lifecycle when an
  asynchronous dependency changes.
- Share display-only rendering when several views duplicate one drawing algorithm. Keep selection
  and gesture lifecycles in responsibility-named owners around it.
- For complex visualizations, separate defensive semantic projection, rendering algorithms, and
  presentation controls when they evolve independently. Make renderer and shell consume the same
  validated projection.
- Treat translator context, resource namespace, component registration, imports, and helper-object
  ownership as part of a declarative component's boundary.

## Validate Runtime Ownership

Select checks for the contracts the change could alter; broader coverage follows repository policy.

- When component registration, resources, or imports change, load through the packaged namespace.
- When interaction wiring moves, exercise a representative real interaction. Direct controller calls
  do not prove pointer, focus, accessibility, signal, or control wiring.
- When translation context or locale-change handling moves, switch language on the same live object
  tree and back, covering the affected contexts. Run the full language matrix when required locally.
- Inspect diagnostics from these checks, including successful runs, for relevant binding, resource,
  provider, or lifecycle warnings.
- Reject stale presentation callbacks with a complete resource or request identity. A visible
  generation counter alone is insufficient when storage, scale, color state, or backing resource
  can change independently.
- Verify representative geometry visually when clipping, overlap, spacing, or gestures are material.
- When shared operation admission changes, test a foreground action while a background operation
  owns the slot and observe the foreground action's durable terminal effect.
