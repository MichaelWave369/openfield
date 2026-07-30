import {
  createHash,
  createPrivateKey,
  createPublicKey,
  sign,
  timingSafeEqual,
  verify,
  type KeyObject
} from "node:crypto";
import type { ReceiptPayload, Sha256Digest, SignedReceipt } from "@/domain/evidence";
import { canonicalJson } from "@/lib/canonical-json";

function asBytes(value: string | Uint8Array): Uint8Array {
  return typeof value === "string" ? new TextEncoder().encode(value) : value;
}

export function sha256(value: string | Uint8Array): Sha256Digest {
  return `sha256:${createHash("sha256").update(asBytes(value)).digest("hex")}`;
}

export function importPrivateEd25519Key(value: KeyObject | string): KeyObject {
  return typeof value === "string"
    ? createPrivateKey({ key: Buffer.from(value, "base64"), format: "der", type: "pkcs8" })
    : value;
}

export function importPublicEd25519Key(value: KeyObject | string): KeyObject {
  return typeof value === "string"
    ? createPublicKey({ key: Buffer.from(value, "base64"), format: "der", type: "spki" })
    : value;
}

export function signDigest(value: string, privateKey: KeyObject | string): string {
  return sign(null, Buffer.from(value), importPrivateEd25519Key(privateKey)).toString("base64");
}

export function verifyDigestSignature(
  value: string,
  signatureBase64: string,
  publicKey: KeyObject | string
): boolean {
  return verify(
    null,
    Buffer.from(value),
    importPublicEd25519Key(publicKey),
    Buffer.from(signatureBase64, "base64")
  );
}

export function createUnsignedReceipt(payload: ReceiptPayload): SignedReceipt {
  return { payload, payloadHash: sha256(canonicalJson(payload)), signature: null };
}

export function signReceipt(
  receipt: SignedReceipt,
  privateKey: KeyObject | string,
  keyId: string
): SignedReceipt {
  const expectedHash = sha256(canonicalJson(receipt.payload));
  if (expectedHash !== receipt.payloadHash) throw new Error("Receipt payload hash does not match payload");
  return {
    ...receipt,
    signature: {
      algorithm: "Ed25519",
      keyId,
      valueBase64: signDigest(receipt.payloadHash, privateKey)
    }
  };
}

export type ReceiptVerification = {
  payloadHashValid: boolean;
  signaturePresent: boolean;
  signatureValid: boolean;
  artifactHashValid: boolean | null;
  envelopeValid: boolean;
  valid: boolean;
};

export function verifyReceipt(
  receipt: SignedReceipt,
  publicKey: KeyObject | string | null,
  artifactBytes?: Uint8Array
): ReceiptVerification {
  const expectedHash = sha256(canonicalJson(receipt.payload));
  const left = Buffer.from(expectedHash);
  const right = Buffer.from(receipt.payloadHash);
  const payloadHashValid = left.length === right.length && timingSafeEqual(left, right);
  const artifactHashValid = artifactBytes ? sha256(artifactBytes) === receipt.payload.artifactHash : null;
  let signatureValid = false;
  if (receipt.signature && publicKey && payloadHashValid) {
    signatureValid = verifyDigestSignature(receipt.payloadHash, receipt.signature.valueBase64, publicKey);
  }
  const signaturePresent = receipt.signature !== null;
  const envelopeValid = payloadHashValid && signaturePresent && signatureValid;
  return {
    payloadHashValid,
    signaturePresent,
    signatureValid,
    artifactHashValid,
    envelopeValid,
    valid: envelopeValid && artifactHashValid === true
  };
}
