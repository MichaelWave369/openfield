import { describe, expect, it } from "vitest";
import type { EvidenceRecord } from "@/domain/evidence";
import { MemoryEvidenceStore } from "@/lib/store/memory";

const confidence = {
  sourceReliability: 1,
  directness: 1,
  corroboration: 0.5,
  independence: 0.5,
  freshness: 1,
  contradictionPenalty: 0,
  uncertainty: 0.1
};

function record(recordId: string, recordedAt: string, summary: string, supersedesRecordId: string | null): EvidenceRecord {
  return {
    recordId,
    recordKey: "permit:SYN-1",
    missionId: "data-center-watch",
    kind: "observation",
    title: "Permit status",
    summary,
    location: null,
    validFrom: "2026-07-30T00:00:00.000Z",
    validTo: null,
    recordedAt,
    supersedesRecordId,
    receiptIds: [],
    dependencyRecordIds: [],
    confidence,
    synthetic: true
  };
}

describe("MemoryEvidenceStore", () => {
  it("replays what was known at a historical time", async () => {
    const store = new MemoryEvidenceStore();
    await store.appendRecord(record("r1", "2026-07-30T01:00:00.000Z", "preliminary", null));
    await store.appendRecord(record("r2", "2026-07-30T03:00:00.000Z", "approved", "r1"));

    const early = await store.listRecords({ knownAt: "2026-07-30T02:00:00.000Z" });
    const late = await store.listRecords({ knownAt: "2026-07-30T04:00:00.000Z" });
    expect(early[0].summary).toBe("preliminary");
    expect(late[0].summary).toBe("approved");
  });

  it("rejects mutation under an existing record id", async () => {
    const store = new MemoryEvidenceStore();
    await store.appendRecord(record("r1", "2026-07-30T01:00:00.000Z", "preliminary", null));
    await expect(store.appendRecord(record("r1", "2026-07-30T01:00:00.000Z", "changed", null)))
      .rejects.toThrow("append-only");
  });
});
