import { describe, expect, it } from "vitest";
import type { RecordEntityLink, ReviewDecision, ReviewItem } from "@/domain/mission";
import { acceptedRecordEntityLinks, effectiveReviewState } from "@/lib/review-queue";
import { MemoryMissionStore } from "@/lib/mission-store/memory";
import { proposeRecordEntityLink } from "@/services/propose-entity-link";

const item: ReviewItem = {
  reviewId: "review:1", missionId: "data-center-watch", reviewType: "record-entity-link",
  subjectId: "link:1", evidenceRecordIds: ["record:1"], rationale: "name match",
  createdAt: "2026-07-30T20:00:00.000Z", createdBy: "matcher"
};
const link: RecordEntityLink = {
  linkId: "link:1", missionId: "data-center-watch", recordId: "record:1", entityId: "entity:1",
  relation: "about", rationale: "name match", proposedAt: "2026-07-30T20:00:00.000Z", proposedBy: "matcher"
};

describe("analyst review queue", () => {
  it("requires every proposed link to carry a matching review item", async () => {
    const store = new MemoryMissionStore();
    await proposeRecordEntityLink(store, { link, review: item });
    expect(await store.listRecordEntityLinks()).toHaveLength(1);
    expect(await store.listReviewItems()).toHaveLength(1);
    let message = "";
    try {
      await proposeRecordEntityLink(store, { link: { ...link, linkId: "link:bad" }, review: item });
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    expect(message).toContain("Review subject");
  });

  it("keeps proposed links out until an explicit acceptance decision", () => {
    expect(effectiveReviewState(item, []).status).toBe("pending");
    expect(acceptedRecordEntityLinks([link], [item], [])).toHaveLength(0);
    const decisions: ReviewDecision[] = [{
      decisionId: "decision:1", reviewId: item.reviewId, decision: "accept",
      decidedAt: "2026-07-30T21:00:00.000Z", decidedBy: "analyst", notes: null
    }];
    expect(acceptedRecordEntityLinks([link], [item], decisions)).toHaveLength(1);
  });

  it("uses the latest append-only decision known at the query time", () => {
    const decisions: ReviewDecision[] = [
      { decisionId: "d1", reviewId: item.reviewId, decision: "defer", decidedAt: "2026-07-30T21:00:00.000Z", decidedBy: "a", notes: null },
      { decisionId: "d2", reviewId: item.reviewId, decision: "accept", decidedAt: "2026-07-30T22:00:00.000Z", decidedBy: "a", notes: null }
    ];
    expect(effectiveReviewState(item, decisions, "2026-07-30T21:30:00.000Z").status).toBe("deferred");
    expect(effectiveReviewState(item, decisions, "2026-07-30T22:30:00.000Z").status).toBe("accepted");
  });
});
