# Parallax OpenField

> **Public intelligence with receipts.**  
> See the world. See the sources. See the uncertainty.

Parallax OpenField is an evidence-governed, map-first workspace for collecting public observations, preserving provenance, separating fact from inference, and reconstructing what was known at any point in time.

The current build remains deliberately honest: the interface and first connector use **clearly labeled synthetic data** while the durable evidence spine is established. No live feed is represented as connected.

## v0.2 evidence spine

- PostgreSQL 16 + PostGIS local stack
- Append-only artifacts, receipts, evidence records, and source-health samples
- Canonical JSON and SHA-256 content addressing
- Ed25519 receipt signing and verification
- Source registration with licensing, mission scope, refresh expectations, and privacy class
- Bitemporal queries: valid time versus recorded/known time
- Source freshness decay with healthy, degraded, stale, offline, and unknown states
- Governed connector contract and synthetic Data Center Watch ingestion path
- Memory adapter for tests and PostgreSQL adapter for durable operation

## Run locally

```bash
cp .env.example .env.local
npm install
npm run db:up
npm run dev
```

Open `http://localhost:3000`. The database initialization script runs automatically when the Docker volume is first created.

Run the complete validation suite:

```bash
npm run check
```

Stop the local database with `npm run db:down`.

## API

- `GET /api/health`
- `GET /api/v1/events`
- `GET /api/v1/sources`

## Truth boundary

OpenField never silently turns generated prose into evidence. Every record remains explicitly classified, every inference names its dependencies, every receipt points to source and transformation metadata, and every unknown stays visible.

The current repository contains **zero live connectors**. The synthetic connector is required to pass the same registration, custody, signing, temporal, and health contracts that future lawful public connectors must satisfy.

## Principles

1. Evidence before narrative.
2. Provenance survives transformation.
3. Freshness and source health remain visible.
4. Contradiction and dissent are retained.
5. Human operators retain final authority.
6. Privacy and civil liberties are architectural constraints.
7. Synthetic data never masquerades as live intelligence.
8. History is appended, not silently rewritten.

## License

Apache-2.0.
