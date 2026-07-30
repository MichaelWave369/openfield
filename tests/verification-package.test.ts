import { generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";
import { SyntheticDataCenterConnector } from "@/connectors/data-center-watch/synthetic";
import { MemoryEvidenceStore } from "@/lib/store/memory";
import { ingestConnectorBatch } from "@/services/ingest";
import { buildVerificationPackage } from "@/services/verification-package";

describe("verification package", () => {
  it("exports records with independently checkable receipt status", async () => {
    const store = new MemoryEvidenceStore();
    const { privateKey, publicKey } = generateKeyPairSync("ed25519");
    const batch = await new SyntheticDataCenterConnector().collect();

    await ingestConnectorBatch(batch, {
      store,
      signer: { keyId: "test-key", privateKey },
      nodeId: "test-node",
      receiptId: () => "receipt:package:1"
    });

    const output = await buildVerificationPackage(
      store,
      { missionId: "data-center-watch", knownAt: "2026-07-30T17:00:00.000Z" },
      { publicKey, exportedAt: "2026-07-30T17:01:00.000Z" }
    );

    expect(output.integrity).toEqual({
      recordCount: 1,
      receiptCount: 1,
      missingReceiptIds: [],
      invalidPayloadReceiptIds: [],
      invalidSignatureReceiptIds: []
    });
    expect(output.receipts[0].verification.signatureValid).toBe(true);
  });
});
