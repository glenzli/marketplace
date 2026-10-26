# Publish validated direct work

Load when the user has authorized a commit. Run declared validation on the working bytes first;
Git publication does not make unvalidated bytes authoritative.

While the Claim is active:

```bash
python3 <skill>/scripts/coord.py --root ROOT direct-commit \
  --scope SCOPE --owner OWNER --run-id RUN \
  --summary "what changed" --validation-evidence "checks and results"

python3 <skill>/scripts/coord.py --root ROOT claim-release \
  --scope SCOPE --owner OWNER --run-id RUN --summary "validated work committed"

python3 <skill>/scripts/coord.py --root ROOT leave \
  --owner OWNER --run-id RUN --outcome completed --summary "completed result"
```

`direct-commit` stages only materialized intended paths, binds the exact tree, and serializes the
shared index/branch with transaction publication. Verify the resulting Git revision, intended diff,
and remaining dirty state. A completed coordination record alone is not proof of source coverage.
Commit authorization does not authorize a push.

Integrate independently complete, validated results promptly. A long session or a high file count
alone does not require splitting a commit. Keep a cohesive refactor, reference update, or generated
change together when intermediate commits would be incomplete or inconsistent.

The 128-path Claim limit counts declared files or directories, not changed files inside a declared
directory. `publish-results` has the same limit on the union of declared result paths. Ordinary
direct commits and Work Result publication can include larger changed-file sets. Choose directory
scopes that match ownership without broadening into another owner's work.

If existing Work Results together exceed that declaration limit, use the existing `direct-commit`
path under a directory-scoped active Claim after reviewing inherited dirty work and resolving any
overlap. Preserve the immutable Work Results; the limit does not require splitting a cohesive commit.
Microtransactions retain their separate 128 changed-path cap; use the existing waiting, handoff, or
exclusive route for a larger cohesive change, as described in
[contention-and-transactions.md](contention-and-transactions.md).

## Git metadata permissions and recovery

The producer preflights Git-write capability before creating a durable direct-commit intent. If
permission is denied, do not repeat the command in the same restricted sandbox. Obtain approved
Git-write execution, or finish the validated dirty Work Result and leave with publication pending.
A failure without `direct_commit_id` created no publication authority; it is not an unrecoverable
transaction. Do not bypass the managed boundary with raw Git.

If a returned `direct_commit_id` reports `needs-attention`, preserve it and inspect
`direct-commit-doctor`. Load [recovery-and-cutover.md](recovery-and-cutover.md) and reconcile under an
exact active steward Run with Git-write capability. The durable record covers ambiguous crash
windows; it does not make ordinary completion depend on a commit.

## Plugin release identity

When publishing Dev Mesh itself, build from the validated clean source revision with
`scripts/plugin_dist.py`. Check release metadata `source_revision` and `tree_sha256`, then verify the
installed runtime and skill bytes against that package. A matching manifest version alone cannot
show that the installed producer includes a source fix. CLI-only compatible changes need a plugin
release, not a control-plane version change or a workspace cutover.
