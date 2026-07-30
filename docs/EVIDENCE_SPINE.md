# Durable Evidence Spine

## Object chain

```text
source registration
  -> artifact hash
  -> receipt payload hash
  -> Ed25519 signature
  -> evidence record
  -> mission query / replay
```

## Receipt verification

A receipt is valid only when:

1. canonical serialization of its payload reproduces `payloadHash`;
2. the Ed25519 signature verifies against that payload hash;
3. supplied artifact bytes reproduce `artifactHash`;
4. the source registration authorizes the mission and collection mode;
5. synthetic status remains consistent from source through record.

Artifact-byte verification can be deferred when the artifact is stored externally. In that state the signed envelope may be integrity-valid, but the receipt remains not fully verified until the bytes reproduce `artifactHash`.

## Bitemporal meaning

- **Valid time** answers: “When was this condition asserted to hold in the world?”
- **Recorded time** answers: “When did this OpenField node possess this version of the record?”

A replay query can therefore ask both:

> Show records valid at 10:00, using only information known by 10:15.

Corrections never overwrite history. A later version shares the same `record_key`, receives a new `record_id`, and optionally names the record it supersedes.

## Source health decay

The expected refresh interval is part of source registration. Freshness decays exponentially with a half-life equal to one expected interval. State boundaries are:

- healthy: age ≤ 1.5 intervals;
- degraded: age ≤ 3 intervals;
- stale: age > 3 intervals;
- offline: at least 3 consecutive failures;
- unknown: no successful collection or no health sample;
- disabled: registration is not authorized to run.

## Production key handling

Private signing keys must not be committed to Git. Production keys should be stored in a secret manager or hardware-backed service, rotated under a visible key ID, and paired with a revocation record. Public verification keys may be distributed openly.
