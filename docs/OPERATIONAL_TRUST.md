# Operational Trust Layer

OpenField v0.3 adds governance around the mechanisms that produce evidence.

## Signing keys

A key ID refers to one public key only. Changing the public key requires a new key ID. State changes append versions:

- `active` — may create new signatures;
- `retired` — no new signatures, historical signatures remain evaluable;
- `revoked` — signatures at or after `invalidatesSignaturesFrom` are untrusted.

A revocation can therefore express the difference between orderly retirement and suspected compromise.

## Privacy directives

Privacy actions never rewrite evidence rows:

- `suppress-content` — hides bytes and blocks export;
- `suppress-export` — permits controlled internal custody while blocking export;
- `restore` — re-enables access through a later directive.

Exports retain hashes and minimal custody metadata when source bytes are suppressed, making the suppression visible rather than pretending the artifact never existed.

## Connector execution receipts

Each governed run records:

- connector and source identity;
- manifest and configuration hashes;
- start and finish time;
- outcome;
- request and upstream-status counts;
- artifact and record counts;
- safe error code and hashed error summary;
- node identity and signing key.

Execution receipts are signed separately from evidence receipts.
