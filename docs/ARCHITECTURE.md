# OpenField Architecture v0.2

```text
Public Source
    |
    v
Governed Connector -----> Source Health Ledger
    |
    v
Raw Artifact --SHA-256--> Signed Receipt Envelope
    |                           |
    +-------- append-only ------+
                |
                v
      Bitemporal Evidence Record
                |
                v
   Map / Timeline / Graph / Replay
                |
                v
 Double C Chambers -> Human Authority
```

## Runtime layers

1. **Connector boundary** — declares source owner, license, scope, refresh cadence, rate limit, failure behavior, and privacy class.
2. **Artifact layer** — preserves original bytes or an immutable storage URI under a SHA-256 address.
3. **Receipt layer** — canonical payload linking source, collection, validity, transformations, license, collector, and artifact hash. Receipts may be Ed25519 signed; production ingestion requires a signer.
4. **Evidence layer** — append-only observation, claim, inference, forecast, contradiction, or unknown records.
5. **Temporal layer** — `valid_from/valid_to` describe when something was true in the world; `recorded_at` describes when OpenField knew it.
6. **Mission layer** — map, timeline, graph, replay, and verification-package views.
7. **Authority layer** — GovernOtter, GovernOri, Protected Dissenter, and final human authorization.

## Storage modes

- `postgres-postgis`: durable evidence spine selected when `DATABASE_URL` is configured.
- `volatile-memory`: development/test mode. The health endpoint names this mode explicitly; it must not be presented as durable.

## Append-only rule

Artifacts, receipts, records, and health samples cannot be updated or deleted through normal database operations. Corrections create new records with `supersedes_record_id`; previous knowledge remains replayable.

## Failure semantics

A connector may emit no observations when its source is unavailable. It must still emit an explicit health sample. Stale material is not silently presented as current, and a failed connector may not reuse an earlier timestamp to appear healthy.
