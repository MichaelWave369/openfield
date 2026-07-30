# ADR 0003 — Governed privacy tombstones

- Status: Accepted for v0.3
- Date: 2026-07-30

## Decision

Do not mutate evidence custody rows to implement routine suppression. Append a privacy directive and enforce it in export and presentation layers.

## Why

Silent deletion damages auditability, while unconditional publication can violate privacy, security, legal obligations, or source terms. A visible tombstone preserves both accountability and restraint.

## Consequences

Hashes and governance history remain reconstructable. Raw storage requires separate encryption, retention, and lawful-erasure controls in a later milestone. Direct database access must not be treated as a safe export mechanism.
