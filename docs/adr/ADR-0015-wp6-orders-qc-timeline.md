# ADR-0015: Released-version orders, QC decisions, and production timeline

Date: 2026-08-26  
Status: Accepted

## Context

A factory order cannot follow a moving design target. Quality decisions also
need to identify the order, released garment version, checklist version,
evidence, actor, and any accepted exception.

## Decision

- A production order requires an approved cost sheet, active factory, and the
  same released garment Freeze Frame. Its source version is immutable.
- A later Freeze Frame marks the order stale. It never silently repoints the
  order; a formal revision produces a new commercial decision.
- Production milestones are normalized ordered rows with owner, target date,
  completion time, and status. The Timeline is a projection across samples,
  fit, costing, order, milestones, and QC rather than copied event text.
- QC templates and checks are versioned. Applying one creates an inspection
  pinned to the order version and stable result rows for every check.
- Required failures block approval. A waiver is append-only and requires actor,
  reason, time, affected check, and a garment-scoped follow-up task.
- Cost approval, order status, QC decision, and waiver creation emit append-only
  change events. Same-Studio policies and least-privilege grants protect every
  new table; anonymous access remains unavailable.

## Consequences

Production and QC decisions can be replayed against the exact released source.
Restore and later technical edits preserve orders, inspections, evidence, and
waivers while surfacing downstream consequences. Editorial migration remains
out of scope until WP7.

