import type { SignedReceipt } from "@/domain/evidence";
import type { KeyTrustEvaluation, SigningKeyRegistration } from "@/domain/trust";
import { verifyReceipt, type ReceiptVerification } from "@/lib/receipts";

function millis(value: string): number {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new Error(`Invalid ISO timestamp: ${value}`);
  return parsed;
}

export function validateSigningKeyHistory(history: SigningKeyRegistration[]): void {
  const ordered = [...history].sort((a, b) => a.version - b.version);
  if (ordered.length === 0) return;
  const first = ordered[0];
  if (first.version !== 1 || first.status !== "active" || first.supersedesVersion !== null) {
    throw new Error("A signing key must begin at version 1 in active state");
  }
  for (let index = 0; index < ordered.length; index += 1) {
    const current = ordered[index];
    if (!current.keyId || !current.publicKeyBase64) throw new Error("Signing key identity and public key are required");
    if (current.invalidatesSignaturesFrom && current.status !== "revoked") {
      throw new Error("Only a revoked key may invalidate signatures");
    }
    if (current.validTo && millis(current.validTo) <= millis(current.validFrom)) {
      throw new Error("Signing key validTo must be later than validFrom");
    }
    if (index === 0) continue;
    const previous = ordered[index - 1];
    if (current.version !== previous.version + 1 || current.supersedesVersion !== previous.version) {
      throw new Error("Signing key versions must form an unbroken append-only chain");
    }
    if (current.keyId !== previous.keyId || current.publicKeyBase64 !== previous.publicKeyBase64) {
      throw new Error("A key ID cannot silently change its public key; rotation requires a new key ID");
    }
    if (previous.status === "revoked") throw new Error("A revoked key is terminal");
    if (previous.status === "retired" && current.status === "active") {
      throw new Error("A retired key cannot return to active state");
    }
  }
}

export function evaluateSigningKey(
  history: SigningKeyRegistration[],
  keyId: string,
  signedAt: string,
  knownAt: string = new Date().toISOString()
): KeyTrustEvaluation {
  const known = millis(knownAt);
  const candidates = history
    .filter((entry) => entry.keyId === keyId && millis(entry.recordedAt) <= known)
    .sort((a, b) => a.version - b.version);
  if (candidates.length === 0) {
    return {
      keyId,
      registrationFound: false,
      publicKeyBase64: null,
      status: "unknown",
      trustedForSignature: false,
      reason: "registration-missing",
      evaluatedAt: signedAt,
      knownAt
    };
  }
  validateSigningKeyHistory(candidates);
  const current = candidates[candidates.length - 1];
  const signed = millis(signedAt);
  if (signed < millis(current.validFrom)) {
    return { keyId, registrationFound: true, publicKeyBase64: current.publicKeyBase64, status: current.status,
      trustedForSignature: false, reason: "signature-before-key-validity", evaluatedAt: signedAt, knownAt };
  }
  if (current.validTo && signed >= millis(current.validTo)) {
    return { keyId, registrationFound: true, publicKeyBase64: current.publicKeyBase64, status: current.status,
      trustedForSignature: false, reason: "signature-after-key-validity", evaluatedAt: signedAt, knownAt };
  }
  if (current.status === "revoked" && current.invalidatesSignaturesFrom &&
      signed >= millis(current.invalidatesSignaturesFrom)) {
    return { keyId, registrationFound: true, publicKeyBase64: current.publicKeyBase64, status: current.status,
      trustedForSignature: false, reason: "signature-invalidated-by-revocation", evaluatedAt: signedAt, knownAt };
  }
  return { keyId, registrationFound: true, publicKeyBase64: current.publicKeyBase64, status: current.status,
    trustedForSignature: true, reason: "trusted", evaluatedAt: signedAt, knownAt };
}

export type RegistryReceiptVerification = {
  cryptographic: ReceiptVerification;
  key: KeyTrustEvaluation;
  trusted: boolean;
};

export function verifyReceiptWithKeyRegistry(
  receipt: SignedReceipt,
  history: SigningKeyRegistration[],
  artifactBytes?: Uint8Array,
  knownAt?: string
): RegistryReceiptVerification {
  const keyId = receipt.signature?.keyId ?? "";
  const key = evaluateSigningKey(history, keyId, receipt.payload.recordedAt, knownAt);
  const cryptographic = verifyReceipt(receipt, key.publicKeyBase64, artifactBytes);
  return { cryptographic, key, trusted: cryptographic.valid && key.trustedForSignature };
}
