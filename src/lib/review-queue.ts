import type {
  EffectiveReviewState,
  RecordEntityLink,
  ReviewDecision,
  ReviewItem
} from "@/domain/mission";

export function effectiveReviewState(
  item: ReviewItem,
  decisions: ReviewDecision[],
  knownAt: string = new Date().toISOString()
): EffectiveReviewState {
  const known = Date.parse(knownAt);
  const latest = decisions
    .filter((decision) => decision.reviewId === item.reviewId)
    .filter((decision) => Date.parse(decision.decidedAt) <= known)
    .sort((a, b) => a.decidedAt.localeCompare(b.decidedAt))
    .at(-1) ?? null;
  const status = latest === null
    ? "pending"
    : latest.decision === "accept"
      ? "accepted"
      : latest.decision === "reject"
        ? "rejected"
        : "deferred";
  return { reviewId: item.reviewId, status, latestDecision: latest };
}

export function linkReviewStatus(
  link: RecordEntityLink,
  reviews: ReviewItem[],
  decisions: ReviewDecision[],
  knownAt?: string
): EffectiveReviewState {
  const item = reviews.find((review) =>
    review.reviewType === "record-entity-link" && review.subjectId === link.linkId
  );
  if (!item) return { reviewId: "", status: "pending", latestDecision: null };
  return effectiveReviewState(item, decisions, knownAt);
}

export function acceptedRecordEntityLinks(
  links: RecordEntityLink[],
  reviews: ReviewItem[],
  decisions: ReviewDecision[],
  knownAt?: string
): RecordEntityLink[] {
  return links.filter((link) => linkReviewStatus(link, reviews, decisions, knownAt).status === "accepted");
}
