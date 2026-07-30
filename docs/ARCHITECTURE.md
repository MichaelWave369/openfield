# OpenField Architecture v0.3

```text
Public Source
    |
    v
Governed Connector -------> Source Health
    |                            |
    |                            v
    +--------------------> Signed Execution Receipt
    |
    v
Raw Artifact --SHA-256--> Signed Evidence Receipt
    |                           |
    +---------- append-only ----+
                 |
                 v
       Bitemporal Evidence Record
                 |
        +--------+---------+
        |                  |
        v                  v
 Signing-Key History   Privacy Directives
        |                  |
        +--------+---------+
                 v
      Verification Package v2
                 |
                 v
 Map / Timeline / Graph / Replay
                 |
                 v
 Double C Chambers -> Human Authority
```

## Trust is multidimensional

OpenField evaluates separate questions:

1. Did the artifact bytes reproduce the recorded hash?
2. Did canonical receipt bytes reproduce the payload hash?
3. Did the signature verify cryptographically?
4. Was that key registered and trusted for signatures at that time?
5. Is the source authorized for the mission?
6. Is export currently permitted by privacy directives?
7. Did the connector run itself leave a signed execution receipt?

No single green check silently answers all seven.

## Operational data families

- source registrations and health samples;
- artifacts and signed evidence receipts;
- bitemporal evidence records;
- signing-key lifecycle registrations;
- privacy suppression/restoration directives;
- signed connector-execution receipts.

All six are append-only. Corrections, revocations, and restorations add new records.

## Connector failure semantics

A failed upstream request creates no observations and replays no stale records. The attempt is represented by source health and a signed execution receipt. Ingestion rejection is distinct from an upstream failure so policy errors cannot masquerade as source outages.
