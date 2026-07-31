import { describe, expect, it } from "vitest";
import type { EvidenceRecord } from "@/domain/evidence";
import { MemoryMissionStore } from "@/lib/mission-store/memory";
import { MemoryEvidenceStore } from "@/lib/store/memory";
import { createCompanyWatch, createDocumentSelection } from "@/lib/watchlist";
import { buildMissionEvidencePacket } from "@/services/mission-evidence-packet";

describe("mission evidence packet", () => {
  it("exports accepted timelines and leaves unresolved reviews visible", async () => {
    const evidence = new MemoryEvidenceStore();
    const mission = new MemoryMissionStore();
    const record: EvidenceRecord = {
      recordId: "record:packet:1", recordKey: "record:packet:1", missionId: "data-center-watch",
      kind: "observation", title: "Filing metadata published", summary: "SEC metadata only.", location: null,
      validFrom: "2026-07-29T00:00:00.000Z", validTo: null, recordedAt: "2026-07-30T20:00:00.000Z",
      supersedesRecordId: null, receiptIds: [], dependencyRecordIds: [],
      confidence: { sourceReliability: .98, directness: .99, corroboration: .2, independence: .9,
        freshness: .95, contradictionPenalty: .02, uncertainty: .12 }, synthetic: false
    };
    await evidence.appendRecord(record);
    const watch = createCompanyWatch({
      watchId: "watch:packet:1", label: "Example Compute", cik: "1234",
      createdAt: "2026-07-30T19:00:00.000Z", createdBy: "operator"
    });
    await mission.appendWatchlistEntry(watch);
    await mission.appendDocumentSelection(createDocumentSelection({
      selectionId: "selection:packet:1", missionId: "data-center-watch", watchId: watch.watchId,
      cik: watch.cik as string, accessionNumber: "0000001234-26-000001",
      primaryDocument: "example8k.htm", form: "8-K", filedAt: "2026-07-29T00:00:00.000Z",
      reason: "manual review", selectedAt: "2026-07-30T19:10:00.000Z", selectedBy: "operator"
    }));
    await mission.appendMissionEntity({
      entityId: "entity:packet:1", missionId: "data-center-watch", entityType: "company",
      canonicalName: watch.label, identifiers: { cik: watch.cik as string }, location: null,
      createdAt: "2026-07-30T19:00:00.000Z", createdBy: "operator"
    });
    await mission.appendRecordEntityLink({
      linkId: "link:packet:1", missionId: "data-center-watch", recordId: record.recordId,
      entityId: "entity:packet:1", relation: "filed-by", rationale: "CIK equality",
      proposedAt: "2026-07-30T20:01:00.000Z", proposedBy: "resolver"
    });
    await mission.appendReviewItem({
      reviewId: "review:packet:1", missionId: "data-center-watch", reviewType: "record-entity-link",
      subjectId: "link:packet:1", evidenceRecordIds: [record.recordId], rationale: "confirm link",
      createdAt: "2026-07-30T20:02:00.000Z", createdBy: "resolver"
    });
    const packet = await buildMissionEvidencePacket(evidence, mission, {
      missionId: "data-center-watch", exportedAt: "2026-07-30T21:00:00.000Z"
    });
    expect(packet.watchlist).toHaveLength(1);
    expect(packet.documentSelections).toHaveLength(1);
    expect(packet.timeline).toHaveLength(0);
    expect(packet.unresolvedReviewCount).toBe(1);
    expect(packet.truthBoundary).toContain("does not by itself establish data-center relevance");
  });
});
