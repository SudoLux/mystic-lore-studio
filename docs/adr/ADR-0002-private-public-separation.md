# ADR-0002: Private Studio Data and Public Cuts Remain Separate

Status: Accepted

## Context

Mystic Lore Studio contains private notes, tasks, workflow state, source media,
and account-owned records. Recruiter-facing portfolio routes must be safe for
anonymous visitors and cannot depend on a signed-in browser state.

## Decision

Private Studio tables remain owner-only through RLS. Public portfolio routes
render only sanitized, immutable-ish publication snapshots, called **Public
Cuts** in the Product Bible. Publication is explicit; a private record or a
route path never makes content public. Public images are copied or selected into
the dedicated portfolio presentation path, never exposed by opening private
Storage policies.

## Consequences

- Public routes must never query raw private project, task, note, or editorial
  tables.
- Portfolio snapshot tests remain required for every future public field.
- WP8 must converge the current publication-table representations on one
  canonical public read model while preserving existing public links.
- Public views can show only data that the publication command intentionally
  projects.
