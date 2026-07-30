# Privacy Directives and Tombstones

OpenField must preserve accountability without turning append-only custody into an excuse to publish harmful material forever.

A privacy directive targets an artifact, receipt, evidence record, or source. It records the requester, approver, rationale, effective time, action, and any directive it supersedes.

## Export behavior

- Suppressed records export as an explicit tombstone entry.
- Suppressed receipts may be omitted while their missing/suppressed identifier remains visible.
- Suppressed artifacts retain content hash, media type, byte length, and collection time; bytes and storage URI are removed.
- Restoration adds a new directive. It does not delete the suppression history.

Direct database access is not an approved public-export path. Export services must resolve privacy state before releasing content.
