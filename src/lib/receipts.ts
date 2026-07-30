import {
  createHash,
  createPrivateKey,
  createPublicKey,
  sign,
  timingSafeEqual,
  verify,
  type KeyObject
} from "node:crypto";
import type {
  ReceiptPayload,
  Sha256Digest,
  SignedReceipt
} from "@/domain/evidence";
import { canonicalJson } from "@/lib/canonical-json";

function asBytes(value: string | Uint8Array): Uint8Array {
  return typeof value === "string" ? new TextEncoder().encode(value) : value;
}

export function sha256(value: string | Uint8Array): Sha256Digest {
  return `sha256:${createHash("sha256").update(asBytes(value)).digest("hex")}`;
}

export function createUnsignedReceipt(payload: ReceiptPayload): SignedReceipt {
  return {
    payload,
    payloadHash: sha256(canonicalJson(payload)),
    signature: null
  };
}

export function signReceipt(
  receipt: SignedReceipt,
  privateKey: KeyObject | string,
  keyId: string
): SignedReceipt {
  const expectedHash = sha256(canonicalJson(receipt.payload));
  if (expectedHash !== receipt.payloadHash) {
    throw new Error("Receipt payload hash does not match payload");
  }

  const key = typeof privateKey === "string"
    ? createPrivateKey({ key: Buffer.from(privateKey, "base64"), format: "der", type: "pkcs8" })
    : privateKey;

  const signature = sign(null, Buffer.from(receipt.payloadHash), key);
  return {
    ...receipt,
    signature: {
      algorithm: "Ed25519",
      keyId,
      valueBase64: signature.toString("base64")
    }
  };
}

export type ReceiptVerification = {
  payloadHashValid: boolean;
  signaturePresent: boolean;
  signatureValid: boolean;
  artifactHashValid: boolean | null;
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

  const artifactHashValid = artifactBytes
    ? sha256(artifactBytes) === receipt.payload.artifactHash
    : null;

  let signatureValid = false;
  if (receipt.signature && publicKey && payloadHashValid) {
    const key = typeof publicKey === "string"
      ? createPublicKey({ key: Buffer.from(publicKey, "base64"), format: "der", type: "spki" })
      : publicKey;
    signatureValid = verify(
      null,
      Buffer.from(receipt.payloadHash),
      key,
      Buffer.from(receipt.signature.valueBase64, "base64")
    );
  }

  const signaturePresent = receipt.signature !== null;
  return {
    payloadHashValid,
    signaturePresent,
    signatureValid,
    artifactHashValid,
    valid: payloadHashValid && signaturePresent && signatureValid && artifactHashValid !== false
  };
}
