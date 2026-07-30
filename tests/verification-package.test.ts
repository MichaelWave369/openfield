import { generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";
import { SyntheticDataCenterConnector } from "@/connectors/data-center-watch/synthetic";
import type { PrivacyDirective, SigningKeyRegistration } from "@/domain/trust";
import { MemoryEvidenceStore } from "@/lib/store/memory";
import { ingestConnectorBatch } from "@/services/ingest";
import { buildVerificationPackage } from "@/services/verification-package";

describe("verification package v2", () => {
  it("checks key trust, artifact bytes, and privacy suppression without deleting hashes", async () => {
    const store = new MemoryEvidenceStore();
    const { privateKey, publicKey } = generateKeyPairSync("ed25519");
    const publicKeyBase64 = Buffer.from(publicKey.export({ format: "der", type: "spki" })).toString("base64");
    const key: SigningKeyRegistration = {
      keyId: "test-key", version: 1, algorithm: "Ed25519", publicKeyBase64,
      status: "active", validFrom: "2026-07-30T00:00:00.000Z", validTo: null,
      recordedAt: "2026-07-30T00:00:00.000Z", invalidatesSignaturesFrom: null,
      reason: null, supersedesVersion: null
    };
    await store.appendSigningKey(key);
    const batch = await new SyntheticDataCenterConnector().collect();
    const ingested = await ingestConnectorBatch(batch, {
      store,
      signer: { keyId: "test-key", privateKey },
      nodeId: "test-node",
      receiptId: () => "receipt:package:1"
    });
    const directive: PrivacyDirective = {
      directiveId: "privacy:package:1",
      targetType: "artifact",
      targetId: ingested.artifactHashes[0],
      action: "suppress-export",
      reasonCode: "source-terms",
      rationale: "Test export suppression",
      requestedAt: "2026-07-30T16:30:00.000Z",
      approvedAt: "2026-07-30T16:31:00.000Z",
      approvedBy: "operator:test",
      effectiveAt: "2026-07-30T16:31:00.000Z",
      supersedesDirectiveId: null
    };
    await store.appendPrivacyDirective(directive);

    const output = await buildVerificationPackage(
      store,
      { missionId: "data-center-watch", knownAt: "2026-07-30T17:00:00.000Z" },
      { exportedAt: "2026-07-30T17:01:00.000Z" }
    );

    expect(output.packageVersion).toBe("openfield.verification-package.v2");
    expect(output.receipts[0].verification.trusted).toBe(true);
    expect(output.receipts[0].artifact?.contentBase64).toBeUndefined();
    expect(output.receipts[0].artifact?.artifactHash).toBe(ingested.artifactHashes[0]);
    expect(output.integrity.privacySuppressedTargets).toContain(`artifact:${ingested.artifactHashes[0]}`);
  });
});
