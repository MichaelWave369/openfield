# OpenField Architecture v0.4

```text
Official Public Source
        |
        v
Governed Connector ---> Signed Execution Receipt ---> Source Health
        |
        v
Raw Artifact ---> Signed Evidence Receipt ---> Bitemporal Record
                                             |
                                             v
Operator Watchlist ---> Proposed Entity Link ---> Analyst Review
                                                | accepted only
                                                v
                                      Evidence-backed Timeline
                                                |
                                                v
                                      Mission Evidence Packet
                                                |
                                                v
                                  Double C Chambers -> Human Authority
```

## Runtime layers

1. **Connector boundary** — source authority, license, privacy class, rate limits, failure behavior, and exact configuration hash.
2. **Artifact layer** — original bytes or immutable storage URI under a SHA-256 address.
3. **Receipt layer** — signed custody envelope connecting source, collection, transformation, artifact, and license.
4. **Evidence layer** — observation, claim, inference, forecast, contradiction, or unknown with valid and recorded time.
5. **Operational trust layer** — signing-key history, privacy directives, connector execution receipts, and verification packages.
6. **Mission operations layer** — watchlists, entities, proposed links, review decisions, selected documents, timelines, and mission packets.
7. **Authority layer** — analyst decisions, GovernOtter, GovernOri, Protected Dissenter, and final human authorization.

## Entity-link authority

A resolver may propose a link but cannot publish it to the primary mission timeline. The timeline service requires a matching review item and an accepted latest decision at the query's knowledge time.

## Document custody

SEC filing documents are retrieved only from operator-created selections. The exact response bytes are stored before any future text extraction. Extraction, classification, and relevance assessment must each become explicit transformations or review decisions rather than invisible preprocessing.
