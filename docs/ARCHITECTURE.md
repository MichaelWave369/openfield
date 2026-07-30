# OpenField Architecture v0.1

```text
Sources -> Connectors -> Normalization -> Receipt Ledger -> Temporal Graph
                                               |                |
                                               v                v
                                       Claim Boundary      Mission Views
                                               |                |
                                               +------> CC Chambers -> Human Authority
```

The foundation build implements the operator console, record classes, transparent confidence vector, synthetic mission fixture, API boundary, tests, and governance documentation. It intentionally avoids live collection until source licensing and health are enforceable.

Target layers include PostgreSQL/PostGIS, immutable source artifacts, signed receipts, temporal entity relationships, isolated connector workers, model-agnostic Computational Collaborator chambers, policy enforcement, and exportable verification packages.

Every connector must declare its owner, license, attribution, expected refresh interval, rate limit, geographic coverage, and failure behavior. A source may emit nothing rather than silently serving stale data.
