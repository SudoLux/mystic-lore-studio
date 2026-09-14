# ADR-0003: Use Read-Through, Domain-by-Domain Migration

Status: Accepted

## Context

The current browser aggregate mixes project identity, workflow, material links,
media, editorial data, and portfolio settings. Rewriting it wholesale would
break offline data, cloud synchronization, and public publication behavior.

## Decision

Mystic Lore Studio 2.0 will use additive, reversible-or-recoverable migrations
and read-through adapters. Each work package adds one canonical domain, verifies
the representative legacy fixture can import and round-trip with no loss, then
switches the matching route only after parity checks pass. Legacy records are
retired only after a documented cutover.

## Consequences

- No destructive reset or table replacement is permitted in normal migrations.
- Each new schema surface needs RLS, indexes, typed adapters, and fixture-based
  dry-run verification before a UI cutover.
- The current `lookbook_pages`/Editorial Collections overlap and the local-only
  editorial merge gap are migration inputs, not shortcuts to erase data.
- WP0 provides the initial fixture, route behavior tests, screenshot baseline,
  and ledger that later packages must update.
