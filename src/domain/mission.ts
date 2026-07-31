import type { GeographicPoint, IsoTimestamp, RecordKind } from "@/domain/evidence";

export const missionEntityTypes = ["company", "site", "project", "filing"] as const;
export type MissionEntityType = (typeof missionEntityTypes)[number];

export type WatchlistEntry = {
  watchId: string;
  missionId: string;
  subjectKind: "company" | "site" | "project";
  label: string;
  cik: string | null;
  identifiers: Record<string, string>;
  aliases: string[];
  tags: string[];
  status: "active" | "paused" | "retired";
  createdAt: IsoTimestamp;
  createdBy: string;
  notes: string | null;
};

export type MissionEntity = {
  entityId: string;
  missionId: string;
  entityType: MissionEntityType;
  canonicalName: string;
  identifiers: Record<string, string>;
  location: GeographicPoint | null;
  createdAt: IsoTimestamp;
  createdBy: string;
};

export const entityRelations = [
  "about",
  "filed-by",
  "located-at",
  "supports",
  "contradicts",
  "supersedes"
] as const;
export type EntityRelation = (typeof entityRelations)[number];

export type RecordEntityLink = {
  linkId: string;
  missionId: string;
  recordId: string;
  entityId: string;
  relation: EntityRelation;
  rationale: string;
  proposedAt: IsoTimestamp;
  proposedBy: string;
};

export const reviewTypes = ["record-entity-link", "document-relevance"] as const;
export type ReviewType = (typeof reviewTypes)[number];

export type ReviewItem = {
  reviewId: string;
  missionId: string;
  reviewType: ReviewType;
  subjectId: string;
  evidenceRecordIds: string[];
  rationale: string;
  createdAt: IsoTimestamp;
  createdBy: string;
};

export type ReviewDecision = {
  decisionId: string;
  reviewId: string;
  decision: "accept" | "reject" | "defer";
  decidedAt: IsoTimestamp;
  decidedBy: string;
  notes: string | null;
};

export type EffectiveReviewState = {
  reviewId: string;
  status: "pending" | "accepted" | "rejected" | "deferred";
  latestDecision: ReviewDecision | null;
};

export type DocumentSelection = {
  selectionId: string;
  missionId: string;
  watchId: string;
  cik: string;
  accessionNumber: string;
  primaryDocument: string;
  form: string;
  filedAt: IsoTimestamp;
  reason: string;
  selectedAt: IsoTimestamp;
  selectedBy: string;
};

export type MissionTimelineEntry = {
  entityId: string;
  entityName: string;
  recordId: string;
  recordKey: string;
  relation: EntityRelation;
  kind: RecordKind;
  title: string;
  summary: string;
  validFrom: IsoTimestamp;
  recordedAt: IsoTimestamp;
  confidenceScore: number;
  reviewStatus: EffectiveReviewState["status"];
  claimBoundary: string;
};

export type MissionTimelineQuery = {
  missionId: string;
  entityId?: string;
  knownAt?: IsoTimestamp;
  validAt?: IsoTimestamp;
  includeProposed?: boolean;
};
