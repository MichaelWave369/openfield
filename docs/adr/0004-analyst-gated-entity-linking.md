# ADR 0004 — Analyst-gated entity linking

- Status: Accepted for v0.4
- Date: 2026-07-30

## Context

Entity resolution is useful but dangerous. A shared name, nearby address, corporate affiliate, or model-generated similarity can be mistaken for verified identity and then contaminate maps, timelines, and briefings.

## Decision

Store record-to-entity links as append-only proposals. Require a separate review item for every proposal. Admit a link to the primary mission timeline only when the latest decision known at the query time is `accept`.

Review decisions are append-only. Later decisions do not erase what an earlier analyst knew or approved.

## Consequences

- Automated matchers can assist without gaining publication authority.
- Accepted links remain reconstructable to the analyst decision.
- Pending, rejected, and deferred matches remain available for audit.
- Mission timelines are intentionally slower than fully automatic dashboards.
