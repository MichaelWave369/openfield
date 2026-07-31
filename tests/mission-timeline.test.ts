import { describe, expect, it } from "vitest";
import type { EvidenceRecord } from "@/domain/evidence";
import type { MissionEntity, RecordEntityLink, ReviewDecision, ReviewItem } from "@/domain/mission";
import { MemoryMissionStore } from "@/lib/mission-store/memory";
import { MemoryEvidenceStore } from "@/lib/store/memory";
import { buildMissionTimeline } from "@/services/mission-timeline";

const record: EvidenceRecord = {
  recordId: "record:timeline:1", recordKey: "record:timeline:1", missionId: "data-center-watch",
  kind: "observation", title: "Company filed an 8-K", summary: "Direct SEC filing metadata.",
  location: null, validFrom: "2026-07-29T00:00:00.000Z", validTo: null,
  recordedAt: "2026-07-30T20:00:00.000Z", supersedesRecordId: null,
  receiptIds: [], dependencyRecordIds: [],
  confidence: { sourceReliability: .98, directness: .99, corroboration: .2, independence: .9,
    freshness: .95, contradictionPenalty: .02, uncertainty: .12 }, synthetic: false
};
const entity: MissionEntity = {
  entityId: "entity:company:1", missionId: "data-center-watch", entityType: "company",
  canonicalName: "Example Compute", identifiers: { cik: "0000001234" }, location: null,
  createdAt: "2026-07-30T20:00:00.000Z", createdBy: "operator"
};
const link: RecordEntityLink = {
  linkId: "link:timeline:1", missionId: "data-center-watch", recordId: record.recordId,
  entityId: entity.entityId, relation: "filed-by", rationale: "CIK equality",
  proposedAt: "2026-07-30T20:01:00.000Z", proposedBy: "resolver"
};
const review: ReviewItem = {
  reviewId: "review:timeline:1", missionId: "data-center-watch", reviewType: "record-entity-link",
  subjectId: link.linkId, evidenceRecordIds: [record.recordId], rationale: "Confirm CIK link",
  createdAt: "2026-07-30T20:02:00.000Z", createdBy: "resolver"
};

describe("mission timeline", () => {
  it("does not publish proposed entity links before analyst acceptance", async () => {
    const evidence = new MemoryEvidenceStore();
    const mission = new MemoryMissionStore();
    await evidence.appendRecord(record);
    await mission.appendMissionEntity(entity);
    await mission.appendRecordEntityLink(link);
    await mission.appendReviewItem(review);
    expect(await buildMissionTimeline(evidence, mission, { missionId: "data-center-watch" })).toHaveLength(0);
    const proposed = await buildMissionTimeline(evidence, mission, {
      missionId: "data-center-watch", includeProposed: true
    });
    expect(proposed[0].reviewStatus).toBe("pending");
  });

  it("preserves claim class after acceptance instead of turning links into facts", async () => {
    const evidence = new MemoryEvidenceStore();
    const mission = new MemoryMissionStore();
    await evidence.appendRecord(record);
    await mission.appendMissionEntity(entity);
    await mission.appendRecordEntityLink(link);
    await mission.appendReviewItem(review);
    const decision: ReviewDecision = {
      decisionId: "decision:timeline:1", reviewId: review.reviewId, decision: "accept",
      decidedAt: "2026-07-30T20:03:00.000Z", decidedBy: "analyst", notes: "CIK matches"
    };
    await mission.appendReviewDecision(decision);
    const timeline = await buildMissionTimeline(evidence, mission, { missionId: "data-center-watch" });
    expect(timeline).toHaveLength(1);
    expect(timeline[0].kind).toBe("observation");
    expect(timeline[0].claimBoundary).toContain("meaning is not implied");
  });
});
