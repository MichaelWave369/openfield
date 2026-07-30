import type { KeyObject } from "node:crypto";
import type { EvidenceRecord, SignedReceipt, TemporalQuery } from "@/domain/evidence";
import { verifyReceipt } from "@/lib/receipts";
import type { EvidenceStore } from "@/lib/store/types";

export type PackagedReceipt = {
  receipt: SignedReceipt;
  verification: {
    payloadHashValid: boolean;
    signaturePresent: boolean;
    signatureValid: boolean | null;
  };
};

export type VerificationPackage = {
  packageVersion: "openfield.verification-package.v1";
  exportedAt: string;
  query: TemporalQuery;
  records: EvidenceRecord[];
  receipts: PackagedReceipt[];
  integrity: {
    recordCount: number;
    receiptCount: number;
    missingReceiptIds: string[];
    invalidPayloadReceiptIds: string[];
    invalidSignatureReceiptIds: string[];
  };
};

export async function buildVerificationPackage(
  store: EvidenceStore,
  query: TemporalQuery,
  options: { publicKey?: KeyObject | string; exportedAt?: string } = {}
): Promise<VerificationPackage> {
  const records = await store.listRecords(query);
  const receiptIds = [...new Set(records.flatMap((record) => record.receiptIds))].sort();
  const receipts: PackagedReceipt[] = [];
  const missingReceiptIds: string[] = [];
  const invalidPayloadReceiptIds: string[] = [];
  const invalidSignatureReceiptIds: string[] = [];

  for (const receiptId of receiptIds) {
    const receipt = await store.getReceipt(receiptId);
    if (!receipt) {
      missingReceiptIds.push(receiptId);
      continue;
    }

    const result = verifyReceipt(receipt, options.publicKey ?? null);
    if (!result.payloadHashValid) invalidPayloadReceiptIds.push(receiptId);
    if (options.publicKey && !result.signatureValid) invalidSignatureReceiptIds.push(receiptId);

    receipts.push({
      receipt,
      verification: {
        payloadHashValid: result.payloadHashValid,
        signaturePresent: result.signaturePresent,
        signatureValid: options.publicKey ? result.signatureValid : null
      }
    });
  }

  return {
    packageVersion: "openfield.verification-package.v1",
    exportedAt: options.exportedAt ?? new Date().toISOString(),
    query,
    records,
    receipts,
    integrity: {
      recordCount: records.length,
      receiptCount: receipts.length,
      missingReceiptIds,
      invalidPayloadReceiptIds,
      invalidSignatureReceiptIds
    }
  };
}
