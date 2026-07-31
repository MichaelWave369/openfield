import type {
  DocumentSelection,
  MissionEntity,
  RecordEntityLink,
  ReviewDecision,
  ReviewItem,
  WatchlistEntry
} from "@/domain/mission";

export interface MissionStore {
  readonly mode: "memory" | "postgres";
  appendWatchlistEntry(entry: WatchlistEntry): Promise<void>;
  appendMissionEntity(entity: MissionEntity): Promise<void>;
  appendRecordEntityLink(link: RecordEntityLink): Promise<void>;
  appendReviewItem(item: ReviewItem): Promise<void>;
  appendReviewDecision(decision: ReviewDecision): Promise<void>;
  appendDocumentSelection(selection: DocumentSelection): Promise<void>;
  listWatchlist(missionId?: string): Promise<WatchlistEntry[]>;
  listMissionEntities(missionId?: string): Promise<MissionEntity[]>;
  listRecordEntityLinks(missionId?: string): Promise<RecordEntityLink[]>;
  listReviewItems(missionId?: string): Promise<ReviewItem[]>;
  listReviewDecisions(reviewId?: string): Promise<ReviewDecision[]>;
  listDocumentSelections(missionId?: string): Promise<DocumentSelection[]>;
}
