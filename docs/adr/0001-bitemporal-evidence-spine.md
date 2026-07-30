# ADR 0001 — Append-only bitemporal evidence spine

- Status: Accepted for v0.2
- Date: 2026-07-30

## Context

A map-first intelligence interface can create false confidence when records are mutable, source freshness is hidden, or later corrections erase what analysts previously saw. OpenField must support both world-time reconstruction and knowledge-time reconstruction.

## Decision

Use PostgreSQL/PostGIS with four append-only custody families:

1. artifacts;
2. signed receipts;
3. evidence record versions;
4. source-health samples.

Evidence records carry valid time and recorded time. Corrections append a new version under the same logical `record_key` and may point to the superseded record.

## Consequences

### Positive

- Historical replay is reconstructable.
- A correction cannot silently rewrite an earlier briefing.
- Spatial and temporal queries remain in one durable system.
- Receipt and source-health history can be audited independently.

### Costs

- Storage grows monotonically.
- Erasure and privacy obligations require a separate governed redaction/tombstone design rather than ad hoc deletion.
- Query logic must distinguish current state from state known at a prior time.

## Rejected alternatives

- Mutable current-state rows: destroys knowledge history.
- Event time only: cannot answer what was known when.
- Recorded time only: cannot represent delayed or corrected observations about the world.
