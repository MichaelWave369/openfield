import { generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";
import type { SigningKeyRegistration } from "@/domain/trust";
import { evaluateSigningKey, validateSigningKeyHistory } from "@/lib/key-registry";

function publicBase64(): string {
  const { publicKey } = generateKeyPairSync("ed25519");
  return Buffer.from(publicKey.export({ format: "der", type: "spki" })).toString("base64");
}

describe("signing key registry", () => {
  it("preserves valid historical signatures while enforcing explicit compromise time", () => {
    const publicKeyBase64 = publicBase64();
    const history: SigningKeyRegistration[] = [
      {
        keyId: "node-key-1", version: 1, algorithm: "Ed25519", publicKeyBase64,
        status: "active", validFrom: "2026-07-30T00:00:00.000Z", validTo: null,
        recordedAt: "2026-07-30T00:00:00.000Z", invalidatesSignaturesFrom: null,
        reason: "initial registration", supersedesVersion: null
      },
      {
        keyId: "node-key-1", version: 2, algorithm: "Ed25519", publicKeyBase64,
        status: "revoked", validFrom: "2026-07-30T00:00:00.000Z", validTo: null,
        recordedAt: "2026-08-01T00:00:00.000Z",
        invalidatesSignaturesFrom: "2026-07-31T12:00:00.000Z",
        reason: "possible compromise", supersedesVersion: 1
      }
    ];
    validateSigningKeyHistory(history);
    expect(evaluateSigningKey(history, "node-key-1", "2026-07-31T11:59:00.000Z",
      "2026-08-02T00:00:00.000Z").trustedForSignature).toBe(true);
    const after = evaluateSigningKey(history, "node-key-1", "2026-07-31T12:00:00.000Z",
      "2026-08-02T00:00:00.000Z");
    expect(after.trustedForSignature).toBe(false);
    expect(after.reason).toBe("signature-invalidated-by-revocation");
  });

  it("rejects changing public-key bytes under an existing key ID", () => {
    expect(() => validateSigningKeyHistory([
      {
        keyId: "same-id", version: 1, algorithm: "Ed25519", publicKeyBase64: publicBase64(),
        status: "active", validFrom: "2026-07-30T00:00:00.000Z", validTo: null,
        recordedAt: "2026-07-30T00:00:00.000Z", invalidatesSignaturesFrom: null,
        reason: null, supersedesVersion: null
      },
      {
        keyId: "same-id", version: 2, algorithm: "Ed25519", publicKeyBase64: publicBase64(),
        status: "retired", validFrom: "2026-07-30T00:00:00.000Z",
        validTo: "2026-08-01T00:00:00.000Z", recordedAt: "2026-08-01T00:00:00.000Z",
        invalidatesSignaturesFrom: null, reason: "rotation", supersedesVersion: 1
      }
    ])).toThrow(/rotation requires a new key ID/);
  });
});
