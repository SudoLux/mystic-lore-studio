# ADR-0018: Governed AI Candidates and Typed Acceptance

Date: 2026-08-27  
Status: Accepted

## Context

Mystic Lore Studio uses AI across technical flats, POM, BOM, construction,
tech-pack validation, editorial, and portfolio drafting. Those workflows touch
records with different validation, version, permission, release, and privacy
rules. Treating provider output as a normal application write would create a
second, less-governed mutation path and could silently change production or
public evidence.

AI output also needs enough source and model evidence to explain what was
generated, detect when its inputs have changed, reproduce deterministic tests,
and attribute every accepted field to the designer who committed it.

## Decision

- An AI job is an idempotent, retryable request with one of seven bounded job
  types. It records provider, selected model, prompt-template version,
  requesting actor, attempt lineage, source checksum, and timestamps. Raw
  prompts are not stored in the canonical job.
- `ai_job_input_refs` normalizes every input as a same-Studio entity, captured
  revision, optional garment version, field path, checksum, and sort order.
  Acceptance is blocked when any referenced revision has changed.
- Provider output is an immutable private `ai_artifact`. Its candidate,
  provenance, contextual confidence, generation time, source checksum, and
  candidate checksum cannot be rewritten. Generated media must resolve to the
  owning Studio's private asset prefix.
- The application may select individual fields only when the artifact declares
  them safe for partial acceptance. Otherwise the candidate is accepted as one
  validated unit.
- Acceptance dispatches the existing typed domain commands for flats, POM,
  BOM, construction, validation, editorial blocks, or portfolio projects. The
  resulting normal domain mutations pass the same validation and version
  rules as manual edits and emit `ai_acceptance` change events.
- `ai_artifact_acceptances` records the actor, decision note, operation ID, and
  source/candidate/selected-payload checksums. `ai_acceptance_commands` links
  each selected field to its typed command and immutable domain change event.
- The database decision function succeeds only after those same-operation
  domain event receipts exist. Authenticated browser clients can enqueue jobs
  and read candidates, but cannot insert artifacts, forge provider status, or
  write acceptance evidence directly. Owners and editors decide; reviewers
  and viewers inspect only.
- Rejection is also explicit and audited, but creates no domain record.
  Queued, running, candidate, accepted, rejected, failed, and
  modified-after-generation states remain visible.
- Candidate data, source references, logs, and generated media remain private.
  Public Cut construction still uses its independent allowlist and never reads
  AI job or artifact records.
- The normal test suite uses a deterministic fake provider covering all seven
  workflows. Paid or network model calls are not a test dependency.

## Consequences

The designer remains the only committing authority, while AI can accelerate
work without bypassing domain validation, RLS, the change ledger, release
rules, or publication privacy. Acceptance has more bookkeeping than a direct
write, but its source, selected fields, resulting entities, and actor can be
audited as one operation. Changed inputs require regeneration instead of an
implicit merge. Adding a future provider or workflow requires a versioned
template, explicit input-reference policy, candidate-field contract, typed
command dispatcher, privacy review, and deterministic test fixture.

WP9 does not select a production model provider or add autonomous writes.
Performance, resilience, accessibility, and broader security hardening remain
bounded to WP10.
