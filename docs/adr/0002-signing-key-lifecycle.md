# ADR 0002 — Append-only signing-key lifecycle

- Status: Accepted for v0.3
- Date: 2026-07-30

## Decision

Store public signing-key state as append-only versioned registrations. A key ID is permanently bound to one public key. Rotation uses a new key ID. Revocation includes an explicit `invalidatesSignaturesFrom` time.

## Why

Cryptographic validity and operational trust are different. A signature can verify mathematically while being untrusted because the signing key was compromised.

## Consequences

Historical verification becomes reconstructable. Operators must manage key registration before connector execution. Private keys remain outside the ledger.
