import type { KeyObject } from "node:crypto";
import type { ConnectorExecutionPayload, SignedConnectorExecution } from "@/domain/trust";
import { canonicalJson } from "@/lib/canonical-json";
import { sha256, signDigest, verifyDigestSignature } from "@/lib/receipts";

export function signConnectorExecution(
  payload: ConnectorExecutionPayload,
  privateKey: KeyObject | string,
  keyId: string
): SignedConnectorExecution {
  const payloadHash = sha256(canonicalJson(payload));
  return {
    payload,
    payloadHash,
    signature: {
      algorithm: "Ed25519",
      keyId,
      valueBase64: signDigest(payloadHash, privateKey)
    }
  };
}

export function verifyConnectorExecution(
  execution: SignedConnectorExecution,
  publicKey: KeyObject | string | null
): { payloadHashValid: boolean; signatureValid: boolean; valid: boolean } {
  const payloadHashValid = sha256(canonicalJson(execution.payload)) === execution.payloadHash;
  const signatureValid = Boolean(
    payloadHashValid &&
    publicKey &&
    verifyDigestSignature(execution.payloadHash, execution.signature.valueBase64, publicKey)
  );
  return { payloadHashValid, signatureValid, valid: payloadHashValid && signatureValid };
}
