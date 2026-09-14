# ADR-0009: WP4 POM, Measurement, and Grading Model

Status: Accepted  
Date: 2026-08-25

## Context

POM authoring, targets, tolerances, grade deltas, and sample actuals need stable
identity and predictable decimal behavior. Canvas-only markers, mixed storage
units, or destructive grading would make fit history and later restores
unreliable.

## Decision

- `pom_points` owns stable code, name, method, sort order, and normalized
  diagram coordinates. Both canvas markers and the keyboard list edit this row.
- `technical_specs.unit` is the single canonical storage unit for its targets,
  tolerances, grade deltas, and fit actuals. Alternate units are converted for
  display only and never written back implicitly.
- Measurement rows retain stable set/POM/size identity and asymmetric plus and
  minus tolerances with four-decimal precision.
- Fit actuals reference stable POM identity and a sample round. Variance is
  calculated against the selected target; tolerance boundaries are inclusive.
- Grade application has a pure preview. Commit creates a separate graded
  measurement set and never changes the base set.
- Technical checkpoints include POM, measurement, and grade structure.
  Selective restore updates only selected structured fields, creates a new
  checkpoint and restore-operation record, and leaves later fit actuals intact.
- CSV import validates headers, row shape, quoting, duplicate identity,
  decimals, normalized anchors, and non-negative target/tolerance values before
  committing any row.

## Consequences

The same stable POM can accumulate base targets, graded sizes, and multiple
sample actuals. The desktop grid remains the fastest authoring surface while
native inputs, keyboard commands, synchronized lists, and mobile row cards
retain complete access to the structured data. BOM, construction, and final
tech-pack completion remain outside this segment.
