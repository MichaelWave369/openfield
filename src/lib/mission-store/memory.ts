import type {
  DocumentSelection,
  MissionEntity,
  RecordEntityLink,
  ReviewDecision,
  ReviewItem,
  WatchlistEntry
} from "@/domain/mission";
import { canonicalJson } from "@/lib/canonical-json";
import type { MissionStore } from "@/lib/mission-store/types";

function appendImmutable<T>(map: Map<string, T>, key: string, value: T, label: string): void {
  const existing = map.get(key);
  if (!existing) {
    map.set(key, structuredClone(value));
    return;
  }
  if (canonicalJson(existing) !== canonicalJson(value)) {
    throw new Error(`${label} ${key} is append-only and already exists with different content`);
  }
}

export class MemoryMissionStore implements MissionStore {
  readonly mode = "memory" as const;
  private readonly watchlist = new Map<string, WatchlistEntry>();
  private readonly entities = new Map<string, MissionEntity>();
  private readonly links = new Map<string, RecordEntityLink>();
  private readonly reviewItems = new Map<string, ReviewItem>();
  private readonly reviewDecisions = new Map<string, ReviewDecision>();
  private readonly selections = new Map<string, DocumentSelection>();

  async appendWatchlistEntry(entry: WatchlistEntry): Promise<void> {
    appendImmutable(this.watchlist, entry.watchId, entry, "watchlist entry");
  }
  async appendMissionEntity(entity: MissionEntity): Promise<void> {
    appendImmutable(this.entities, entity.entityId, entity, "mission entity");
  }
  async appendRecordEntityLink(link: RecordEntityLink): Promise<void> {
    appendImmutable(this.links, link.linkId, link, "record entity link");
  }
  async appendReviewItem(item: ReviewItem): Promise<void> {
    appendImmutable(this.reviewItems, item.reviewId, item, "review item");
  }
  async appendReviewDecision(decision: ReviewDecision): Promise<void> {
    appendImmutable(this.reviewDecisions, decision.decisionId, decision, "review decision");
  }
  async appendDocumentSelection(selection: DocumentSelection): Promise<void> {
    appendImmutable(this.selections, selection.selectionId, selection, "document selection");
  }

  async listWatchlist(missionId?: string): Promise<WatchlistEntry[]> {
    return [...this.watchlist.values()]
      .filter((entry) => !missionId || entry.missionId === missionId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map((entry) => structuredClone(entry));
  }
  async listMissionEntities(missionId?: string): Promise<MissionEntity[]> {
    return [...this.entities.values()]
      .filter((entry) => !missionId || entry.missionId === missionId)
      .sort((a, b) => a.canonicalName.localeCompare(b.canonicalName))
      .map((entry) => structuredClone(entry));
  }
  async listRecordEntityLinks(missionId?: string): Promise<RecordEntityLink[]> {
    return [...this.links.values()]
      .filter((entry) => !missionId || entry.missionId === missionId)
      .sort((a, b) => a.proposedAt.localeCompare(b.proposedAt))
      .map((entry) => structuredClone(entry));
  }
  async listReviewItems(missionId?: string): Promise<ReviewItem[]> {
    return [...this.reviewItems.values()]
      .filter((entry) => !missionId || entry.missionId === missionId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map((entry) => structuredClone(entry));
  }
  async listReviewDecisions(reviewId?: string): Promise<ReviewDecision[]> {
    return [...this.reviewDecisions.values()]
      .filter((entry) => !reviewId || entry.reviewId === reviewId)
      .sort((a, b) => a.decidedAt.localeCompare(b.decidedAt))
      .map((entry) => structuredClone(entry));
  }
  async listDocumentSelections(missionId?: string): Promise<DocumentSelection[]> {
    return [...this.selections.values()]
      .filter((entry) => !missionId || entry.missionId === missionId)
      .sort((a, b) => a.selectedAt.localeCompare(b.selectedAt))
      .map((entry) => structuredClone(entry));
  }
}
