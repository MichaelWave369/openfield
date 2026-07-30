import type {
  EvidenceArtifact,
  EvidenceRecord,
  SignedReceipt,
  TemporalQuery
} from "@/domain/evidence";
import type { PrivacyState } from "@/domain/trust";
import { verifyReceiptWithKeyRegistry } from "@/lib/key-registry";
import { artifactForExport, resolvePrivacyState } from "@/lib/privacy";
import type { EvidenceStore } from "@/lib/store/types";

export type PackagedRecord = {
  recordId: string;
  record: EvidenceRecord | null;
  privacy: PrivacyState;
};

export type PackagedReceipt = {
  receiptId: string;
  receipt: SignedReceipt | null;
  artifact: EvidenceArtifact | null;
  verification: {
    payloadHashValid: boolean;
    signaturePresent: boolean;
    signatureValid: boolean;
    artifactHashValid: boolean | null;
    keyRegistered: boolean;
    keyTrusted: boolean;
    keyStatus: string;
    trusted: boolean;
  };
  privacy: {
    receipt: PrivacyState;
    artifact: PrivacyState;
    source: PrivacyState;
  };
};

export type VerificationPackage = {
  packageVersion: "openfield.verification-package.v2";
  exportedAt: string;
  query: TemporalQuery;
  records: PackagedRecord[];
  receipts: PackagedReceipt[];
  integrity: {
    recordCount: number;
    visibleRecordCount: number;
    receiptCount: number;
    missingReceiptIds: string[];
    missingArtifactHashes: string[];
    invalidPayloadReceiptIds: string[];
    invalidSignatureReceiptIds: string[];
    revokedOrUntrustedKeyReceiptIds: string[];
    artifactMismatchReceiptIds: string[];
    privacySuppressedTargets: string[];
  };
};

function bytes(artifact: EvidenceArtifact | null): Uint8Array | undefined {
  return artifact?.contentBase64 ? Buffer.from(artifact.contentBase64, "base64") : undefined;
}

function blocked(...states: PrivacyState[]): boolean {
  return states.some((state) => !state.exportAllowed);
}

export async function buildVerificationPackage(
  store: EvidenceStore,
  query: TemporalQuery,
  options: { exportedAt?: string; knownAt?: string } = {}
): Promise<VerificationPackage> {
  const exportedAt = options.exportedAt ?? new Date().toISOString();
  const knownAt = options.knownAt ?? exportedAt;
  const rawRecords = await store.listRecords(query);
  const allDirectives = await store.listPrivacyDirectives();
  const records: PackagedRecord[] = rawRecords.map((record) => {
    const privacy = resolvePrivacyState(allDirectives, "record", record.recordId, knownAt);
    return { recordId: record.recordId, record: privacy.exportAllowed ? record : null, privacy };
  });
  const receiptIds = [...new Set(rawRecords.flatMap((record) => record.receiptIds))].sort();
  const receipts: PackagedReceipt[] = [];
  const missingReceiptIds: string[] = [];
  const missingArtifactHashes: string[] = [];
  const invalidPayloadReceiptIds: string[] = [];
  const invalidSignatureReceiptIds: string[] = [];
  const revokedOrUntrustedKeyReceiptIds: string[] = [];
  const artifactMismatchReceiptIds: string[] = [];
  const privacySuppressedTargets = new Set<string>();

  for (const receiptId of receiptIds) {
    const receipt = await store.getReceipt(receiptId);
    if (!receipt) {
      missingReceiptIds.push(receiptId);
      continue;
    }
    const artifact = await store.getArtifact(receipt.payload.artifactHash);
    if (!artifact) missingArtifactHashes.push(receipt.payload.artifactHash);
    const history = receipt.signature
      ? await store.listSigningKeyHistory(receipt.signature.keyId)
      : [];
    const verification = verifyReceiptWithKeyRegistry(receipt, history, bytes(artifact), knownAt);
    if (!verification.cryptographic.payloadHashValid) invalidPayloadReceiptIds.push(receiptId);
    if (!verification.cryptographic.signatureValid) invalidSignatureReceiptIds.push(receiptId);
    if (!verification.key.trustedForSignature) revokedOrUntrustedKeyReceiptIds.push(receiptId);
    if (verification.cryptographic.artifactHashValid === false) artifactMismatchReceiptIds.push(receiptId);

    const receiptPrivacy = resolvePrivacyState(allDirectives, "receipt", receiptId, knownAt);
    const artifactPrivacy = resolvePrivacyState(
      allDirectives,
      "artifact",
      receipt.payload.artifactHash,
      knownAt
    );
    const sourcePrivacy = resolvePrivacyState(allDirectives, "source", receipt.payload.sourceId, knownAt);
    for (const state of [receiptPrivacy, artifactPrivacy, sourcePrivacy]) {
      if (!state.exportAllowed) privacySuppressedTargets.add(`${state.targetType}:${state.targetId}`);
    }
    const receiptBlocked = blocked(receiptPrivacy, sourcePrivacy);
    const artifactBlocked = blocked(artifactPrivacy, sourcePrivacy);
    receipts.push({
      receiptId,
      receipt: receiptBlocked ? null : receipt,
      artifact: artifact
        ? artifactForExport(artifact, artifactBlocked
          ? { ...artifactPrivacy, exportAllowed: false, contentVisible: false }
          : artifactPrivacy)
        : null,
      verification: {
        payloadHashValid: verification.cryptographic.payloadHashValid,
        signaturePresent: verification.cryptographic.signaturePresent,
        signatureValid: verification.cryptographic.signatureValid,
        artifactHashValid: verification.cryptographic.artifactHashValid,
        keyRegistered: verification.key.registrationFound,
        keyTrusted: verification.key.trustedForSignature,
        keyStatus: verification.key.status,
        trusted: verification.trusted
      },
      privacy: { receipt: receiptPrivacy, artifact: artifactPrivacy, source: sourcePrivacy }
    });
  }

  for (const packaged of records) {
    if (!packaged.privacy.exportAllowed) {
      privacySuppressedTargets.add(`record:${packaged.recordId}`);
    }
  }

  return {
    packageVersion: "openfield.verification-package.v2",
    exportedAt,
    query,
    records,
    receipts,
    integrity: {
      recordCount: records.length,
      visibleRecordCount: records.filter((entry) => entry.record !== null).length,
      receiptCount: receipts.length,
      missingReceiptIds,
      missingArtifactHashes,
      invalidPayloadReceiptIds,
      invalidSignatureReceiptIds,
      revokedOrUntrustedKeyReceiptIds,
      artifactMismatchReceiptIds,
      privacySuppressedTargets: [...privacySuppressedTargets].sort()
    }
  };
}
