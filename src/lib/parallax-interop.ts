import type { EvidenceRecord, SignedReceipt } from "@/domain/evidence";
import { canonicalJson } from "@/lib/canonical-json";
import { sha256 } from "@/lib/receipts";

export type ParallaxReceipt = {
  schema: "parallax.receipt.v1";
  receiptId: string;
  profile: "evidence";
  createdAt: string;
  producer: "OpenField";
  subjectRefs: string[];
  inputHashes: string[];
  outputHashes: string[];
  status: "recorded";
  warnings: string[];
  lineageRefs: string[];
  evidenceRefs: string[];
  policyRefs: string[];
  approvalRefs: string[];
  signature: null | {
    algorithm: "Ed25519";
    keyId: string;
    value: string;
    guarantee: string;
  };
  payload: Record<string, unknown>;
};

export type ParallaxEvidenceRecord = {
  schema: "parallax.evidence.v1";
  recordId: string;
  kind: EvidenceRecord["kind"];
  title: string;
  summary: string;
  validFrom: string | null;
  validTo: string | null;
  recordedAt: string;
  sourceRefs: string[];
  receiptRefs: string[];
  dependencyRecordIds: string[];
  supersedesRecordId: string | null;
  confidence: EvidenceRecord["confidence"];
  synthetic: boolean;
  location: EvidenceRecord["location"];
  native: EvidenceRecord;
};

export type ParallaxReviewBundle = {
  schema: "parallax.review_bundle.v1";
  bundleId: string;
  producer: "OpenField";
  createdAt: string;
  authority: "NONE";
  evidenceRefs: string[];
  receiptRefs: string[];
  subjectRefs: string[];
  recordKinds: EvidenceRecord["kind"][];
  synthetic: boolean;
  integrity: {
    artifactHash: string;
    receiptPayloadHash: string;
    nativePayloadHash: string;
  };
  verification: {
    nativeCryptographicVerificationRequired: true;
    cryptographicValidity: "not-evaluated-by-projection";
    evidenceTruth: "not-established";
  };
  native: {
    evidenceRecord: EvidenceRecord;
    signedReceipt: SignedReceipt;
  };
};

export function toParallaxEvidenceReceipt(signed: SignedReceipt): ParallaxReceipt {
  const payload = signed.payload;
  return {
    schema: "parallax.receipt.v1",
    receiptId: payload.receiptId,
    profile: "evidence",
    createdAt: payload.recordedAt,
    producer: "OpenField",
    subjectRefs: [
      payload.sourceId,
      ...(payload.sourceRecordId ? [payload.sourceRecordId] : [])
    ],
    inputHashes: payload.transformations.map((step) => step.inputHash),
    outputHashes: [
      payload.artifactHash,
      ...payload.transformations.map((step) => step.outputHash)
    ],
    status: "recorded",
    warnings: [],
    lineageRefs: [],
    evidenceRefs: [],
    policyRefs: [],
    approvalRefs: [],
    signature: signed.signature
      ? {
          algorithm: signed.signature.algorithm,
          keyId: signed.signature.keyId,
          value: signed.signature.valueBase64,
          guarantee: "Native OpenField Ed25519 signature representation."
        }
      : null,
    payload: {
      native: signed,
      payloadHash: signed.payloadHash,
      temporal: {
        collectedAt: payload.collectedAt,
        observedAt: payload.observedAt,
        validFrom: payload.validFrom,
        validTo: payload.validTo
      },
      license: payload.license,
      synthetic: payload.synthetic,
      collector: payload.collector
    }
  };
}

export function toParallaxEvidenceRecord(
  record: EvidenceRecord
): ParallaxEvidenceRecord {
  return {
    schema: "parallax.evidence.v1",
    recordId: record.recordId,
    kind: record.kind,
    title: record.title,
    summary: record.summary,
    validFrom: record.validFrom,
    validTo: record.validTo,
    recordedAt: record.recordedAt,
    sourceRefs: [],
    receiptRefs: [...record.receiptIds],
    dependencyRecordIds: [...record.dependencyRecordIds],
    supersedesRecordId: record.supersedesRecordId,
    confidence: { ...record.confidence },
    synthetic: record.synthetic,
    location: record.location,
    native: record
  };
}

export function toParallaxReviewBundle(
  record: EvidenceRecord,
  signed: SignedReceipt
): ParallaxReviewBundle {
  if (!record.receiptIds.includes(signed.payload.receiptId)) {
    throw new Error("EvidenceRecord does not reference the supplied receipt");
  }

  const native = {
    evidenceRecord: record,
    signedReceipt: signed
  };

  return {
    schema: "parallax.review_bundle.v1",
    bundleId: `openfield:${record.recordId}:${signed.payload.receiptId}`,
    producer: "OpenField",
    createdAt: record.recordedAt,
    authority: "NONE",
    evidenceRefs: [record.recordId],
    receiptRefs: [signed.payload.receiptId],
    subjectRefs: [record.missionId, record.recordKey],
    recordKinds: [record.kind],
    synthetic: record.synthetic || signed.payload.synthetic,
    integrity: {
      artifactHash: signed.payload.artifactHash,
      receiptPayloadHash: signed.payloadHash,
      nativePayloadHash: sha256(canonicalJson(native))
    },
    verification: {
      nativeCryptographicVerificationRequired: true,
      cryptographicValidity: "not-evaluated-by-projection",
      evidenceTruth: "not-established"
    },
    native
  };
}
