# ADR-0010: WP4 Release Gates, Waivers, and Approval

Status: Accepted  
Date: 2026-08-25

## Context

A technical specification must not become a production release merely because
an export button was pressed. Its flats, measurements, bill of materials,
construction sequence, source evidence, and export template must be complete
and attributable. Legitimate non-privacy exceptions need an audit trail without
weakening the non-negotiable private/public boundary.

## Decision

- Release is a domain command and structured state transition, never a UI-only
  flag. It records the actor, time, validation run, ruleset version, protected
  checkpoint, source garment version, and selected tech-pack template.
- The `wp4-release-v1` ruleset gates approved source-mapped flats, POM methods,
  base measurements and tolerances, linked or intentionally free-text BOM rows,
  complete ordered construction, durable source bytes, and the export template.
- BOM rows reference material/component variants and optional supplier offers
  and substitutes. Free text is allowed only through the explicit
  `intentional_free_text` state.
- Waivers are separate audit records. Every waiver requires the affected rule,
  actor, reason, time, and a follow-up task. Only issues marked waivable by the
  ruleset may be waived.
- The waiver domain constraint intentionally excludes `privacy`. Missing source
  provenance, rights, or other privacy failures remain hard blockers and cannot
  be represented as valid waiver rows.
- Construction templates copy candidate sections, steps, and details through a
  recorded application command. Applying a template never silently rewrites an
  existing authored sequence.
- AI output remains candidate-only and must pass the same human-owned commands,
  validation, and approval flow as manually proposed data.

## Consequences

A released specification has reproducible evidence of what passed, who accepted
any permitted exception, and which checkpoint became authoritative. Release
tasks make follow-up work visible without mutating validation history. Broader
garment version comparison and restore remain WP5 work.
