import { generateKeyPairSync, randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { SyntheticDataCenterConnector } from "@/connectors/data-center-watch/synthetic";
import type { SigningKeyRegistration } from "@/domain/trust";
import { PostgresEvidenceStore } from "@/lib/store/postgres";
import { executeConnector } from "@/services/execute-connector";

const databaseUrl = process.env.DATABASE_URL;

describe("PostgreSQL operational trust round trip", () => {
  const run = databaseUrl ? it : it.skip;
  run("persists and replays evidence, keys, and execution receipts", async () => {
    const store = new PostgresEvidenceStore(databaseUrl as string);
    const { privateKey, publicKey } = generateKeyPairSync("ed25519");
    const suffix = randomUUID();
    const keyId = `integration-key:${suffix}`;
    const registration: SigningKeyRegistration = {
      keyId, version: 1, algorithm: "Ed25519",
      publicKeyBase64: Buffer.from(publicKey.export({ format: "der", type: "spki" })).toString("base64"),
      status: "active", validFrom: "2026-07-30T00:00:00.000Z", validTo: null,
      recordedAt: "2026-07-30T00:00:00.000Z", invalidatesSignaturesFrom: null,
      reason: "CI integration key", supersedesVersion: null
    };
    const base = new SyntheticDataCenterConnector();
    const connector = {
      manifest: {
        ...base.manifest,
        connectorId: `${base.manifest.connectorId}.${suffix}`,
        source: {
          ...base.manifest.source,
          sourceId: `${base.manifest.source.sourceId}.${suffix}`
        }
      },
      async collect() {
        const batch = await base.collect();
        return {
          ...batch,
          batchId: `${batch.batchId}:${suffix}`,
          manifest: this.manifest,
          health: {
            ...batch.health,
            healthId: `${batch.health.healthId}:${suffix}`,
            sourceId: this.manifest.source.sourceId
          },
          records: batch.records.map((record) => ({
            ...record,
            recordId: `${record.recordId}:${suffix}`,
            recordKey: `${record.recordKey}:${suffix}`
          }))
        };
      }
    };
    try {
      const result = await executeConnector(connector, {
        store,
        nodeId: "github-actions",
        signer: { keyId, privateKey },
        signingKeyHistory: [registration],
        now: () => new Date("2026-07-30T18:00:00.000Z"),
        executionId: () => `execution:integration:${suffix}`
      });
      const records = await store.listRecords({ missionId: "data-center-watch" });
      const executions = await store.listConnectorExecutions({ connectorId: connector.manifest.connectorId });
      const keys = await store.listSigningKeyHistory(keyId);
      expect(records.some((record) => record.recordId.endsWith(suffix))).toBe(true);
      expect(executions[0].payload.executionId).toBe(result.execution.payload.executionId);
      expect(keys).toHaveLength(1);
    } finally {
      await store.close();
    }
  });
});
