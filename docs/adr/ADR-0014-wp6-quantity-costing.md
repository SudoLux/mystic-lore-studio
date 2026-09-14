# ADR-0014: Quantity-scenario costing and currency integrity

Date: 2026-08-26  
Status: Accepted

## Context

A costing decision must remain reproducible when quantity, waste, freight, or
wholesale assumptions change. Floating labels such as “estimated cost” are not
enough to explain COGS, margin, or the assumptions used by a production order.

## Decision

- A cost sheet pins one released garment Freeze Frame, ISO 4217 currency,
  quantity basis, wholesale unit price, approval actor, and approval time.
- Cost items use exact numeric amounts at four-decimal precision. Material,
  trim, labor, overhead, and freight are explicit categories; waste is a
  percentage on the applicable row.
- `per_unit` rows scale with the quantity scenario. `per_order` rows remain
  fixed and are allocated across the scenario to derive COGS per unit.
- Every item inherits the sheet currency. A database guard rejects currency
  mismatches, and recalculation triggers keep total COGS and margin consistent.
- BOM, material variant, and component variant sources use foreign keys when
  present. Approval locks the browser scenario; a changed assumption becomes a
  new draft rather than an edit to accepted commercial evidence.

## Consequences

The same inputs reproduce the same totals for 100, 250, 500, or custom-unit
scenarios. Approved costs can be audited beside their exact garment release and
consumed by an order without copying price assumptions into the order itself.

