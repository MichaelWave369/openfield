import { randomUUID, type KeyObject } from "node:crypto";
import type { ConnectorBatch } from "@/domain/connectors";
import type { EvidenceArtifact, EvidenceRecord, ReceiptPayload, SignedReceipt } from "@/domain/evidence";
import { createUnsignedReceipt, sha256, signReceipt } from "@/lib/receipts";
import type { EvidenceStore } from "@/lib/store/types";

export type ReceiptSigner = {
  keyId: string;
  privateKey: KeyObject | string;
};

export type IngestOptions = {
  store: EvidenceStore;
  signer: ReceiptSigner;
  nodeId: string;
  receiptId?: () => string;
  artifactStorageUri?: (artifactHash: string) => string | null;
};

export type IngestResult = {
  batchId: string;
  artifactHashes: string[];
  receiptIds: string[];
  recordIds: string[];
};

function validateBatch(batch: ConnectorBatch): void {
  const { source } = batch.manifest;
  if (batch.health.sourceId !== source.sourceId) {
    throw new Error("Source health sample does not match connector source");
  }
  if (!source.enabled) throw new Error(`Source ${source.sourceId} is disabled`);
  if (source.privacyClass !== "public") {
    throw new Error("The public OpenField ingestion path only admits public source registrations");
  }
  for (const record of batch.records) {
    if (!source.missions.includes(record.missionId)) {
      throw new Error(`Source ${source.sourceId} is not approved for mission ${record.missionId}`);
    }
    if (!batch.artifacts[record.artifactIndex]) {
      throw new Error(`Record ${record.recordId} references a missing artifact`);
    }
    if (record.synthetic !== source.synthetic) {
      throw new Error(`Record ${record.recordId} synthetic status disagrees with its source registration`);
    }
  }
}

export async function ingestConnectorBatch(
  batch: ConnectorBatch,
  options: IngestOptions
): Promise<IngestResult> {
  validateBatch(batch);
  const makeReceiptId = options.receiptId ?? (() => randomUUID());
  const artifacts: EvidenceArtifact[] = [];
  const receipts: SignedReceipt[] = [];

  for (const artifact of batch.artifacts) {
    const artifactHash = sha256(artifact.bytes);
    const evidenceArtifact: EvidenceArtifact = {
      artifactHash,
      mediaType: artifact.mediaType,
      byteLength: artifact.bytes.byteLength,
      collectedAt: artifact.collectedAt,
      storageUri: options.artifactStorageUri?.(artifactHash) ?? null,
      contentBase64: Buffer.from(artifact.bytes).toString("base64")
    };

    const payload: ReceiptPayload = {
      receiptVersion: "openfield.receipt.v1",
      receiptId: makeReceiptId(),
      artifactHash,
      sourceId: batch.manifest.source.sourceId,
      sourceRecordId: artifact.sourceRecordId,
      collectedAt: artifact.collectedAt,
      observedAt: artifact.observedAt,
      validFrom: artifact.validFrom,
      validTo: artifact.validTo,
      recordedAt: batch.collectedAt,
      mediaType: artifact.mediaType,
      byteLength: artifact.bytes.byteLength,
      transformations: artifact.transformations,
      license: batch.manifest.source.license,
      synthetic: batch.manifest.source.synthetic,
      collector: {
        connectorId: batch.manifest.connectorId,
        connectorVersion: batch.manifest.connectorVersion,
        nodeId: options.nodeId
      }
    };

    artifacts.push(evidenceArtifact);
    receipts.push(signReceipt(createUnsignedReceipt(payload), options.signer.privateKey, options.signer.keyId));
  }

  await options.store.appendSource(batch.manifest.source);
  for (const artifact of artifacts) await options.store.appendArtifact(artifact);
  for (const receipt of receipts) await options.store.appendReceipt(receipt);

  const records: EvidenceRecord[] = batch.records.map((record) => ({
    recordId: record.recordId,
    recordKey: record.recordKey,
    missionId: record.missionId,
    kind: record.kind,
    title: record.title,
    summary: record.summary,
    location: record.location,
    validFrom: record.validFrom,
    validTo: record.validTo,
    recordedAt: record.recordedAt,
    supersedesRecordId: record.supersedesRecordId,
    receiptIds: [receipts[record.artifactIndex].payload.receiptId],
    dependencyRecordIds: record.dependencyRecordIds,
    confidence: record.confidence,
    synthetic: record.synthetic
  }));

  for (const record of records) await options.store.appendRecord(record);
  await options.store.appendSourceHealth(batch.health);

  return {
    batchId: batch.batchId,
    artifactHashes: artifacts.map((artifact) => artifact.artifactHash),
    receiptIds: receipts.map((receipt) => receipt.payload.receiptId),
    recordIds: records.map((record) => record.recordId)
  };
}
