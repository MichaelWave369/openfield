import type { MissionTimelineEntry, MissionTimelineQuery } from "@/domain/mission";
import type { EvidenceStore } from "@/lib/store/types";
import type { MissionStore } from "@/lib/mission-store/types";
import { linkReviewStatus } from "@/lib/review-queue";

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
}

function confidenceScore(vector: {
  sourceReliability: number;
  directness: number;
  corroboration: number;
  independence: number;
  freshness: number;
  contradictionPenalty: number;
  uncertainty: number;
}): number {
  const base = 0.25 * clamp01(vector.sourceReliability) +
    0.2 * clamp01(vector.directness) +
    0.2 * clamp01(vector.corroboration) +
    0.15 * clamp01(vector.independence) +
    0.2 * clamp01(vector.freshness);
  const penalty = 0.35 * clamp01(vector.contradictionPenalty) + 0.25 * clamp01(vector.uncertainty);
  return clamp01(base * (1 - penalty));
}

function boundary(kind: MissionTimelineEntry["kind"]): string {
  switch (kind) {
    case "observation": return "Directly attributed observation; meaning is not implied.";
    case "claim": return "Attributed claim; not independently promoted to fact.";
    case "inference": return "Derived inference; dependencies and dissent must remain inspectable.";
    case "forecast": return "Forward-looking forecast; not a statement of current reality.";
    case "contradiction": return "Contradictory evidence retained alongside competing records.";
    case "unknown": return "Known gap; absence of evidence is not filled with generated certainty.";
  }
}

export async function buildMissionTimeline(
  evidenceStore: EvidenceStore,
  missionStore: MissionStore,
  query: MissionTimelineQuery
): Promise<MissionTimelineEntry[]> {
  const [records, entities, links, reviews, decisions] = await Promise.all([
    evidenceStore.listRecords({
      missionId: query.missionId,
      knownAt: query.knownAt,
      validAt: query.validAt
    }),
    missionStore.listMissionEntities(query.missionId),
    missionStore.listRecordEntityLinks(query.missionId),
    missionStore.listReviewItems(query.missionId),
    missionStore.listReviewDecisions()
  ]);
  const recordById = new Map(records.map((record) => [record.recordId, record]));
  const entityById = new Map(entities.map((entity) => [entity.entityId, entity]));

  return links
    .filter((link) => !query.entityId || link.entityId === query.entityId)
    .map((link) => ({ link, review: linkReviewStatus(link, reviews, decisions, query.knownAt) }))
    .filter(({ review }) => query.includeProposed || review.status === "accepted")
    .flatMap(({ link, review }) => {
      const record = recordById.get(link.recordId);
      const entity = entityById.get(link.entityId);
      if (!record || !entity) return [];
      return [{
        entityId: entity.entityId,
        entityName: entity.canonicalName,
        recordId: record.recordId,
        recordKey: record.recordKey,
        relation: link.relation,
        kind: record.kind,
        title: record.title,
        summary: record.summary,
        validFrom: record.validFrom,
        recordedAt: record.recordedAt,
        confidenceScore: confidenceScore(record.confidence),
        reviewStatus: review.status,
        claimBoundary: boundary(record.kind)
      } satisfies MissionTimelineEntry];
    })
    .sort((a, b) => a.validFrom.localeCompare(b.validFrom) || a.recordedAt.localeCompare(b.recordedAt));
}
