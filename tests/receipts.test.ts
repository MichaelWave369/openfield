import { generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";
import type { ReceiptPayload } from "@/domain/evidence";
import { createUnsignedReceipt, sha256, signReceipt, verifyReceipt } from "@/lib/receipts";

const bytes = new TextEncoder().encode("openfield evidence");
const payload: ReceiptPayload = {
  receiptVersion: "openfield.receipt.v1",
  receiptId: "receipt:test:1",
  artifactHash: sha256(bytes),
  sourceId: "fixture.test",
  sourceRecordId: "record-1",
  collectedAt: "2026-07-30T16:00:00.000Z",
  observedAt: "2026-07-30T15:59:00.000Z",
  validFrom: "2026-07-30T15:59:00.000Z",
  validTo: null,
  recordedAt: "2026-07-30T16:00:00.000Z",
  mediaType: "text/plain",
  byteLength: bytes.byteLength,
  transformations: [],
  license: {
    name: "Synthetic",
    attributionRequired: true,
    redistributionAllowed: true
  },
  synthetic: true,
  collector: {
    connectorId: "connector.test",
    connectorVersion: "1.0.0",
    nodeId: "node.test"
  }
};

describe("signed receipts", () => {
  it("verifies payload, signature, and artifact bytes", () => {
    const { privateKey, publicKey } = generateKeyPairSync("ed25519");
    const signed = signReceipt(createUnsignedReceipt(payload), privateKey, "test-key");
    expect(verifyReceipt(signed, publicKey, bytes)).toEqual({
      payloadHashValid: true,
      signaturePresent: true,
      signatureValid: true,
      artifactHashValid: true,
      valid: true
    });
  });

  it("detects payload tampering", () => {
    const { privateKey, publicKey } = generateKeyPairSync("ed25519");
    const signed = signReceipt(createUnsignedReceipt(payload), privateKey, "test-key");
    const tampered = {
      ...signed,
      payload: { ...signed.payload, sourceId: "fixture.changed" }
    };
    expect(verifyReceipt(tampered, publicKey, bytes).valid).toBe(false);
  });
});
