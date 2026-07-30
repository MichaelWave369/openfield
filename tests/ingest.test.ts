import { generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";
import { SyntheticDataCenterConnector } from "@/connectors/data-center-watch/synthetic";
import { verifyReceipt } from "@/lib/receipts";
import { MemoryEvidenceStore } from "@/lib/store/memory";
import { ingestConnectorBatch } from "@/services/ingest";

describe("governed connector ingestion", () => {
  it("stores an artifact, signed receipt, record, source, and health sample", async () => {
    const connector = new SyntheticDataCenterConnector();
    const batch = await connector.collect();
    const store = new MemoryEvidenceStore();
    const { privateKey, publicKey } = generateKeyPairSync("ed25519");

    const result = await ingestConnectorBatch(batch, {
      store,
      signer: { keyId: "test-key", privateKey },
      nodeId: "test-node",
      receiptId: () => "receipt:synthetic:1"
    });

    expect(result.recordIds).toEqual(["record:synthetic-permit:2026-07-30:v1"]);
    const records = await store.listRecords({ missionId: "data-center-watch" });
    expect(records[0].receiptIds).toEqual(["receipt:synthetic:1"]);

    const receipt = await store.getReceipt("receipt:synthetic:1");
    expect(receipt).not.toBeNull();
    expect(verifyReceipt(receipt!, publicKey).valid).toBe(true);

    const health = await store.getLatestSourceHealth(batch.manifest.source.sourceId);
    expect(health?.consecutiveFailures).toBe(0);
  });
});
