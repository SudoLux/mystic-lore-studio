# ADR-0001: Transition From Project to Garment Naming

Status: Accepted for 2.0 foundation

## Context

The current application uses `ApparelProject`, project routes, project tables,
and project-oriented UI labels. The Product Bible establishes **garment** as the
canonical 2.0 product object and allows **project** only for migration
compatibility or a time-bounded body of work.

## Decision

WP0 preserves all current project names, routes, table names, and browser IDs.
Starting in WP1/WP2, new domain interfaces will use `garment` vocabulary and
adapters will translate legacy project records to the canonical garment model.
No global find-and-replace or destructive database rename is permitted.

## Consequences

- Existing deep links, backups, sync records, and public URLs continue working.
- New 2.0 code avoids inventing another meaning for `project`.
- WP2 must document stable mapping between legacy project IDs and garment UUIDs
  plus immutable garment codes.
- Legacy terms can be retired only after route parity, migration round-trip,
  and public snapshot parity are verified.
