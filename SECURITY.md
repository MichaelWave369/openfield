# Security Policy

Do not open a public issue for vulnerabilities that could expose credentials, private data, protected locations, connector secrets, signing keys, or abuse pathways. Contact the repository owner privately through GitHub.

OpenField prohibits covert collection, access-control evasion, stalking, doxxing, individualized movement profiling, and generated allegations represented as verified evidence. Every connector must support rate limits, source-health reporting, revocation, and a documented privacy class.

Never commit `DATABASE_URL`, connector credentials, or Ed25519 private keys. Production receipt signing should use a secret manager or hardware-backed key service. Key IDs must be visible in receipts so compromised or retired keys can be revoked without erasing historical signatures.
