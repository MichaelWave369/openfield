import type { RecordEntityLink, ReviewItem } from "@/domain/mission";
import type { MissionStore } from "@/lib/mission-store/types";

export async function proposeRecordEntityLink(
  store: MissionStore,
  input: {
    link: RecordEntityLink;
    review: ReviewItem;
  }
): Promise<void> {
  if (input.review.reviewType !== "record-entity-link") {
    throw new Error("Record-entity links require a record-entity-link review item");
  }
  if (input.review.subjectId !== input.link.linkId) {
    throw new Error("Review subject must name the proposed record-entity link");
  }
  if (input.review.missionId !== input.link.missionId) {
    throw new Error("Review and link must belong to the same mission");
  }
  if (!input.review.evidenceRecordIds.includes(input.link.recordId)) {
    throw new Error("Review must cite the linked evidence record");
  }
  await store.appendRecordEntityLink(input.link);
  await store.appendReviewItem(input.review);
}
