import type { EffectiveReviewState, MissionTimelineEntry } from "@/domain/mission";
import type { EvidenceStore } from "@/lib/store/types";
import type { MissionStore } from "@/lib/mission-store/types";
import { effectiveReviewState } from "@/lib/review-queue";
import { buildMissionTimeline } from "@/services/mission-timeline";
import { buildVerificationPackage, type VerificationPackage } from "@/services/verification-package";

export type MissionEvidencePacket = {
  packageVersion: "openfield.mission-evidence-packet.v1";
  missionId: string;
  exportedAt: string;
  truthBoundary: string;
  watchlist: Awaited<ReturnType<MissionStore["listWatchlist"]>>;
  entities: Awaited<ReturnType<MissionStore["listMissionEntities"]>>;
  documentSelections: Awaited<ReturnType<MissionStore["listDocumentSelections"]>>;
  timeline: MissionTimelineEntry[];
  reviews: Array<{
    item: Awaited<ReturnType<MissionStore["listReviewItems"]>>[number];
    state: EffectiveReviewState;
  }>;
  unresolvedReviewCount: number;
  verification: VerificationPackage;
};

export async function buildMissionEvidencePacket(
  evidenceStore: EvidenceStore,
  missionStore: MissionStore,
  options: {
    missionId: string;
    exportedAt?: string;
    knownAt?: string;
    validAt?: string;
    includeProposedTimeline?: boolean;
  }
): Promise<MissionEvidencePacket> {
  const exportedAt = options.exportedAt ?? new Date().toISOString();
  const knownAt = options.knownAt ?? exportedAt;
  const [watchlist, entities, documentSelections, reviewItems, reviewDecisions, timeline, verification] =
    await Promise.all([
      missionStore.listWatchlist(options.missionId),
      missionStore.listMissionEntities(options.missionId),
      missionStore.listDocumentSelections(options.missionId),
      missionStore.listReviewItems(options.missionId),
      missionStore.listReviewDecisions(),
      buildMissionTimeline(evidenceStore, missionStore, {
        missionId: options.missionId,
        knownAt,
        validAt: options.validAt,
        includeProposed: options.includeProposedTimeline ?? false
      }),
      buildVerificationPackage(
        evidenceStore,
        { missionId: options.missionId, knownAt, validAt: options.validAt },
        { exportedAt, knownAt }
      )
    ]);
  const reviews = reviewItems.map((item) => ({
    item,
    state: effectiveReviewState(item, reviewDecisions, knownAt)
  }));
  return {
    packageVersion: "openfield.mission-evidence-packet.v1",
    missionId: options.missionId,
    exportedAt,
    truthBoundary: [
      "This packet separates source observations, attributed claims, inferences, forecasts, contradictions, and unknowns.",
      "Entity links appear in the primary timeline only after an explicit analyst acceptance decision.",
      "A filing or document retrieval does not by itself establish data-center relevance, site control, financing, construction, or completion."
    ].join(" "),
    watchlist,
    entities,
    documentSelections,
    timeline,
    reviews,
    unresolvedReviewCount: reviews.filter(({ state }) => state.status === "pending" || state.status === "deferred").length,
    verification
  };
}
