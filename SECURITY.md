# Security Policy

Do not open a public issue for vulnerabilities that could expose credentials, private data, protected locations, connector secrets, signing keys, administrative contact details, or abuse pathways. Contact the repository owner privately through GitHub.

OpenField prohibits covert collection, access-control evasion, stalking, doxxing, individualized movement profiling, generated allegations represented as verified evidence, and attempts to bypass source access policies.

Never commit `DATABASE_URL`, connector credentials, private Ed25519 keys, or production operator tokens. Production signing should use a secret manager or hardware-backed service.

Key revocation and privacy directives are append-only governance records. Do not bypass them by reading raw database content directly into a public export. Public export paths must resolve current key trust and privacy state.

The SEC connector must retain its declared User-Agent, fair-access pacing, explicit failure health, and no-stale-fallback behavior. Do not increase its request rate beyond the upstream policy.
