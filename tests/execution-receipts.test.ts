import { generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";
import { SyntheticDataCenterConnector } from "@/connectors/data-center-watch/synthetic";
import type { SigningKeyRegistration } from "@/domain/trust";
import { verifyConnectorExecution } from "@/lib/execution-receipts";
import { MemoryEvidenceStore } from "@/lib/store/memory";
import { executeConnector } from "@/services/execute-connector";

describe("connector execution receipts", () => {
  it("signs and stores the connector run separately from evidence receipts", async () => {
    const store = new MemoryEvidenceStore();
    const { privateKey, publicKey } = generateKeyPairSync("ed25519");
    const registration: SigningKeyRegistration = {
      keyId: "node-key", version: 1, algorithm: "Ed25519",
      publicKeyBase64: Buffer.from(publicKey.export({ format: "der", type: "spki" })).toString("base64"),
      status: "active", validFrom: "2026-07-30T00:00:00.000Z", validTo: null,
      recordedAt: "2026-07-30T00:00:00.000Z", invalidatesSignaturesFrom: null,
      reason: "test key", supersedesVersion: null
    };
    const result = await executeConnector(new SyntheticDataCenterConnector(), {
      store,
      nodeId: "test-node",
      signer: { keyId: "node-key", privateKey },
      signingKeyHistory: [registration],
      now: () => new Date("2026-07-30T17:00:00.000Z"),
      executionId: () => "execution:test:1"
    });
    expect(result.execution.payload.outcome).toBe("succeeded");
    expect(result.execution.payload.requestCount).toBe(0);
    expect(verifyConnectorExecution(result.execution, publicKey).valid).toBe(true);
    expect(await store.listConnectorExecutions()).toHaveLength(1);
    expect(await store.listRecords({ missionId: "data-center-watch" })).toHaveLength(1);
  });
});
