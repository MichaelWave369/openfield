import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { EvidenceRecord, SignedReceipt } from "@/domain/evidence";
import {
  toParallaxEvidenceReceipt,
  toParallaxEvidenceRecord,
  toParallaxReviewBundle
} from "@/lib/parallax-interop";

const receipt: SignedReceipt = {
  payload: {
    receiptVersion: "openfield.receipt.v1",
    receiptId: "receipt:test",
    artifactHash: `sha256:${"a".repeat(64)}`,
    sourceId: "fixture.test",
    sourceRecordId: "record-1",
    collectedAt: "2026-08-25T16:40:00Z",
    observedAt: "2026-08-25T16:39:59Z",
    validFrom: "2026-08-25T16:39:59Z",
    validTo: null,
    recordedAt: "2026-08-25T16:40:00Z",
    mediaType: "application/json",
    byteLength: 3,
    transformations: [],
    license: {
      name: "Synthetic",
      attributionRequired: false,
      redistributionAllowed: true
    },
    synthetic: true,
    collector: {
      connectorId: "fixture",
      connectorVersion: "1",
      nodeId: "local"
    }
  },
  payloadHash: `sha256:${"b".repeat(64)}`,
  signature: {
    algorithm: "Ed25519",
    keyId: "key-1",
    valueBase64: "ZmFrZQ=="
  }
};

const record: EvidenceRecord = {
  recordId: "record-1",
  recordKey: "test:1",
  missionId: "interop",
  kind: "observation",
  title: "Fixture",
  summary: "Fixture only",
  location: null,
  validFrom: "2026-08-25T16:39:59Z",
  validTo: null,
  recordedAt: "2026-08-25T16:40:00Z",
  supersedesRecordId: null,
  receiptIds: ["receipt:test"],
  dependencyRecordIds: [],
  confidence: {
    sourceReliability: 1,
    directness: 1,
    corroboration: 0,
    independence: 1,
    freshness: 1,
    contradictionPenalty: 0,
    uncertainty: 0.1
  },
  synthetic: true
};

const pass11Fixture = JSON.parse(
  readFileSync(
    new URL("./fixtures/parallax-pass11-governance-review.json", import.meta.url),
    "utf8"
  )
) as {
  native: {
    evidenceRecord: EvidenceRecord;
    signedReceipt: SignedReceipt;
  };
  authority: string;
  integrity: { nativePayloadHash: string };
};

describe("Parallax interop projections", () => {
  it("preserves OpenField native receipt semantics under evidence profile", () => {
    const normalized = toParallaxEvidenceReceipt(receipt);
    expect(normalized.profile).toBe("evidence");
    expect(normalized.outputHashes[0]).toBe(receipt.payload.artifactHash);
    expect(normalized.signature?.algorithm).toBe("Ed25519");
  });

  it("preserves EvidenceRecord class and confidence vector", () => {
    const normalized = toParallaxEvidenceRecord(record);
    expect(normalized.kind).toBe("observation");
    expect(normalized.confidence.uncertainty).toBe(0.1);
    expect(normalized.synthetic).toBe(true);
  });

  it("freezes a no-authority review bundle from native evidence", () => {
    const normalized = toParallaxReviewBundle(
      pass11Fixture.native.evidenceRecord,
      pass11Fixture.native.signedReceipt
    );
    expect(normalized).toEqual(pass11Fixture);
    expect(normalized.authority).toBe("NONE");
    expect(normalized.verification.cryptographicValidity).toBe(
      "not-evaluated-by-projection"
    );
  });

  it("refuses to bundle a receipt the evidence record does not reference", () => {
    expect(() =>
      toParallaxReviewBundle(record, {
        ...receipt,
        payload: { ...receipt.payload, receiptId: "receipt:other" }
      })
    ).toThrow("does not reference");
  });
});
