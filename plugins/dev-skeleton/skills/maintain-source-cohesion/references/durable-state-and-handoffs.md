# Durable State And Handoffs

Use the relevant checks when changing durable mutation authority, external handoffs, publication,
or recovery.

## Keep Commit Authority Explicit

- Distinguish execution, candidate production, acceptance, byte publication, and receipt recording.
  Keep the authority to advance durable state and the actual commit point with their owner.
- Make UI, CLI, and tool adapters share the owning use case. Keep final identity, expected version,
  source, and permission checks at the write boundary; earlier validation can become stale.
- Share policy and pure validators where useful, while retaining revalidation at independent trust
  or consistency boundaries. Similar checks there do not automatically imply duplicate ownership.

## Bind And Recover Handoffs

- Bind results to the exact request, relevant input revisions and content identities, and destination
  owner. A path or claimed receipt alone does not establish identity or authority.
- Keep working copies and candidates separate from accepted history. Verify returned bytes and
  provenance before adoption; process success does not grant acceptance.
- Preserve distinctions between prepared, published, recorded, and unresolved outcomes. After a
  commit or publication, cancellation cannot report that no effect occurred.
- Follow the existing recovery contract after a lost acknowledgement or crash: replay the same
  idempotency identity when supported, or read authoritative state before retrying. A transport
  failure does not prove rollback.

## Verify The Affected Boundary

- Select checks for the changed risk: stale input or head rejection, repeated requests,
  interruption around publication, or reopen recovery. Keep exact gates in the owning repository.
- For an exchanged artifact or protocol change, exercise the actual consumer's acceptance and
  identity/provenance checks. Producer-only serialization tests do not prove interoperability.
