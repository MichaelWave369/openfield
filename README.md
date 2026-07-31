# Parallax OpenField

> **Public intelligence with receipts.**  
> See the world. See the sources. See the uncertainty.

Parallax OpenField is an evidence-governed, map-first workspace for collecting public observations, preserving provenance, separating fact from inference, and reconstructing what was known at any point in time.

## v0.4 mission operations

- Operator-curated company watchlists with normalized SEC CIK identifiers
- Explicit filing-document selections rather than unrestricted URL fetching
- Exact official SEC archive bytes preserved before analysis
- Append-only mission entities and record-to-entity link proposals
- Mandatory analyst review before proposed links enter primary timelines
- Timelines that retain observation, claim, inference, forecast, contradiction, and unknown boundaries
- Mission evidence packets combining watchlists, selections, accepted timelines, unresolved reviews, and Verification Package v2
- PostgreSQL/PostGIS mission storage and integration coverage

The repository remains deliberately honest: the SEC connectors are live-capable but do not run automatically. Operators must configure an identifying User-Agent, create a watch and document selection, register an active signing key, and explicitly execute a governed connector run.

## Run locally

```bash
cp .env.example .env.local
npm install
npm run db:up
npm run db:migrate
npm run dev
```

Open `http://localhost:3000`. Run the complete validation suite with `npm run check`.

## Truth boundary

OpenField never silently turns generated prose into evidence. A filing record establishes that filing metadata was published. A filing-document record establishes that bytes were retrieved from an official archive path. Neither establishes data-center relevance, ownership, financing, construction, power availability, or project completion.

Entity links are proposals until a separate analyst decision accepts them. The record's original claim class remains unchanged after linking.

## Principles

1. Evidence before narrative.
2. Provenance survives transformation.
3. Freshness and source health remain visible.
4. Contradiction and dissent are retained.
5. Human operators retain final authority.
6. Privacy and civil liberties are architectural constraints.
7. Synthetic data never masquerades as live intelligence.
8. History is appended, not silently rewritten.
9. Automated matching does not confer publication authority.

## License

Apache-2.0.
