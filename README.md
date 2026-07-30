# Parallax OpenField

> **Public intelligence with receipts.**  
> See the world. See the sources. See the uncertainty.

Parallax OpenField is an evidence-governed, map-first workspace for collecting public observations, preserving provenance, separating fact from inference, and reconstructing what was known at any point in time.

## v0.3 operational trust layer

- PostgreSQL/PostGIS evidence spine with a real CI round trip
- Append-only signing-key registration, retirement, and revocation history
- Historical key-trust evaluation at the time a receipt was signed
- Append-only privacy directives that suppress content or export without silently deleting custody
- Signed connector-execution receipts for success, upstream failure, ingestion rejection, and connector errors
- Verification Package v2 with artifact-byte checks, key status, and privacy-state reporting
- First lawful public connector: official SEC EDGAR submission metadata for an operator-configured CIK
- Exact upstream response bytes preserved before any filing records are derived
- Explicit SEC fair-access pacing and declared User-Agent requirements

## Truth boundary

OpenField does not turn a filing into a claim about a data center. The SEC connector emits only a direct observation that the SEC published filing metadata. Filing meaning, relevance, and implications remain unknown until separately supported.

The repository contains one live-capable connector, but **no connector runs automatically**. `GET /api/health` reports whether its required configuration is present while keeping `liveFeeds` at zero until an operator executes a governed run.

## Run locally

```bash
cp .env.example .env.local
npm install
npm run db:up
npm run db:migrate
npm run dev
```

Open `http://localhost:3000`.

```bash
npm run check
npm run db:down
```

## SEC EDGAR configuration

```env
OPENFIELD_SEC_CIK=0001652044
OPENFIELD_SEC_USER_AGENT=ParallaxOpenField/0.3 admin@example.org
```

The connector uses `https://data.sec.gov/submissions/CIK##########.json`, sends a declared User-Agent, serializes requests, and enforces an internal maximum of eight requests per second.

## API

- `GET /api/health`
- `GET /api/v1/events`
- `GET /api/v1/sources`

## Principles

1. Evidence before narrative.
2. Provenance survives transformation.
3. Freshness and source health remain visible.
4. Contradiction and dissent are retained.
5. Human operators retain final authority.
6. Privacy and civil liberties are architectural constraints.
7. Synthetic data never masquerades as live intelligence.
8. History is appended, not silently rewritten.
9. A valid signature is not automatically a trusted signature.
10. Suppression is visible, governed, and reversible through new records.

## License

Apache-2.0.
