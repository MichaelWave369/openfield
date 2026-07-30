# Signing-Key Lifecycle

A receipt signature proves control of a private key; key history determines whether that signature is trusted.

## Rules

1. Version 1 begins in `active` state.
2. A key ID cannot change public-key bytes.
3. Rotation creates a new key ID.
4. Version numbers and `supersedesVersion` form an unbroken chain.
5. A retired key cannot return to active state.
6. Revocation is terminal.
7. Revocation names the earliest signature time it invalidates.

Verification evaluates the key state known at export time against the receipt's recorded time. This preserves good historical signatures after orderly retirement while allowing a compromise investigation to invalidate a defined time range.
