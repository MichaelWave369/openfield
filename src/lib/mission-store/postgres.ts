import postgres from "postgres";
import type {
  DocumentSelection,
  MissionEntity,
  RecordEntityLink,
  ReviewDecision,
  ReviewItem,
  WatchlistEntry
} from "@/domain/mission";
import type { MissionStore } from "@/lib/mission-store/types";

function iso(value: unknown): string {
  return new Date(String(value)).toISOString();
}

export class PostgresMissionStore implements MissionStore {
  readonly mode = "postgres" as const;
  private readonly sql: ReturnType<typeof postgres>;

  constructor(databaseUrl: string) {
    this.sql = postgres(databaseUrl, { max: 6, idle_timeout: 20 });
  }
  async close(): Promise<void> { await this.sql.end(); }

  async appendWatchlistEntry(entry: WatchlistEntry): Promise<void> {
    await this.sql`
      insert into openfield.mission_watchlist (
        watch_id, mission_id, subject_kind, label, cik, identifiers, aliases, tags,
        status, created_at, created_by, notes
      ) values (
        ${entry.watchId}, ${entry.missionId}, ${entry.subjectKind}, ${entry.label}, ${entry.cik},
        ${this.sql.json(entry.identifiers)}, ${this.sql.json(entry.aliases)}, ${this.sql.json(entry.tags)},
        ${entry.status}, ${entry.createdAt}, ${entry.createdBy}, ${entry.notes}
      ) on conflict (watch_id) do nothing
    `;
  }
  async appendMissionEntity(entity: MissionEntity): Promise<void> {
    const longitude = entity.location?.coordinates[0] ?? null;
    const latitude = entity.location?.coordinates[1] ?? null;
    await this.sql`
      insert into openfield.mission_entities (
        entity_id, mission_id, entity_type, canonical_name, identifiers, location, created_at, created_by
      ) values (
        ${entity.entityId}, ${entity.missionId}, ${entity.entityType}, ${entity.canonicalName},
        ${this.sql.json(entity.identifiers)},
        case when ${longitude}::double precision is null then null
          else ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326) end,
        ${entity.createdAt}, ${entity.createdBy}
      ) on conflict (entity_id) do nothing
    `;
  }
  async appendRecordEntityLink(link: RecordEntityLink): Promise<void> {
    await this.sql`
      insert into openfield.record_entity_links (
        link_id, mission_id, record_id, entity_id, relation, rationale, proposed_at, proposed_by
      ) values (
        ${link.linkId}, ${link.missionId}, ${link.recordId}, ${link.entityId}, ${link.relation},
        ${link.rationale}, ${link.proposedAt}, ${link.proposedBy}
      ) on conflict (link_id) do nothing
    `;
  }
  async appendReviewItem(item: ReviewItem): Promise<void> {
    await this.sql`
      insert into openfield.review_items (
        review_id, mission_id, review_type, subject_id, evidence_record_ids,
        rationale, created_at, created_by
      ) values (
        ${item.reviewId}, ${item.missionId}, ${item.reviewType}, ${item.subjectId},
        ${item.evidenceRecordIds}, ${item.rationale}, ${item.createdAt}, ${item.createdBy}
      ) on conflict (review_id) do nothing
    `;
  }
  async appendReviewDecision(decision: ReviewDecision): Promise<void> {
    await this.sql`
      insert into openfield.review_decisions (
        decision_id, review_id, decision, decided_at, decided_by, notes
      ) values (
        ${decision.decisionId}, ${decision.reviewId}, ${decision.decision},
        ${decision.decidedAt}, ${decision.decidedBy}, ${decision.notes}
      ) on conflict (decision_id) do nothing
    `;
  }
  async appendDocumentSelection(selection: DocumentSelection): Promise<void> {
    await this.sql`
      insert into openfield.document_selections (
        selection_id, mission_id, watch_id, cik, accession_number, primary_document,
        form, filed_at, reason, selected_at, selected_by
      ) values (
        ${selection.selectionId}, ${selection.missionId}, ${selection.watchId}, ${selection.cik},
        ${selection.accessionNumber}, ${selection.primaryDocument}, ${selection.form},
        ${selection.filedAt}, ${selection.reason}, ${selection.selectedAt}, ${selection.selectedBy}
      ) on conflict (selection_id) do nothing
    `;
  }

  async listWatchlist(missionId?: string): Promise<WatchlistEntry[]> {
    const rows = missionId
      ? await this.sql`select * from openfield.mission_watchlist where mission_id = ${missionId} order by created_at`
      : await this.sql`select * from openfield.mission_watchlist order by created_at`;
    return rows.map((row) => ({
      watchId: String(row.watch_id), missionId: String(row.mission_id),
      subjectKind: row.subject_kind as WatchlistEntry["subjectKind"], label: String(row.label),
      cik: row.cik ? String(row.cik) : null, identifiers: row.identifiers as Record<string, string>,
      aliases: row.aliases as string[], tags: row.tags as string[],
      status: row.status as WatchlistEntry["status"], createdAt: iso(row.created_at),
      createdBy: String(row.created_by), notes: row.notes ? String(row.notes) : null
    }));
  }
  async listMissionEntities(missionId?: string): Promise<MissionEntity[]> {
    const rows = await this.sql.unsafe(`
      select *, ST_X(location) as longitude, ST_Y(location) as latitude
      from openfield.mission_entities
      ${missionId ? "where mission_id = $1" : ""}
      order by canonical_name
    `, missionId ? [missionId] : []);
    return rows.map((row) => ({
      entityId: String(row.entity_id), missionId: String(row.mission_id),
      entityType: row.entity_type as MissionEntity["entityType"], canonicalName: String(row.canonical_name),
      identifiers: row.identifiers as Record<string, string>,
      location: row.longitude === null || row.latitude === null ? null : {
        type: "Point", coordinates: [Number(row.longitude), Number(row.latitude)]
      },
      createdAt: iso(row.created_at), createdBy: String(row.created_by)
    }));
  }
  async listRecordEntityLinks(missionId?: string): Promise<RecordEntityLink[]> {
    const rows = missionId
      ? await this.sql`select * from openfield.record_entity_links where mission_id = ${missionId} order by proposed_at`
      : await this.sql`select * from openfield.record_entity_links order by proposed_at`;
    return rows.map((row) => ({
      linkId: String(row.link_id), missionId: String(row.mission_id), recordId: String(row.record_id),
      entityId: String(row.entity_id), relation: row.relation as RecordEntityLink["relation"],
      rationale: String(row.rationale), proposedAt: iso(row.proposed_at), proposedBy: String(row.proposed_by)
    }));
  }
  async listReviewItems(missionId?: string): Promise<ReviewItem[]> {
    const rows = missionId
      ? await this.sql`select * from openfield.review_items where mission_id = ${missionId} order by created_at`
      : await this.sql`select * from openfield.review_items order by created_at`;
    return rows.map((row) => ({
      reviewId: String(row.review_id), missionId: String(row.mission_id),
      reviewType: row.review_type as ReviewItem["reviewType"], subjectId: String(row.subject_id),
      evidenceRecordIds: (row.evidence_record_ids as string[]) ?? [], rationale: String(row.rationale),
      createdAt: iso(row.created_at), createdBy: String(row.created_by)
    }));
  }
  async listReviewDecisions(reviewId?: string): Promise<ReviewDecision[]> {
    const rows = reviewId
      ? await this.sql`select * from openfield.review_decisions where review_id = ${reviewId} order by decided_at`
      : await this.sql`select * from openfield.review_decisions order by decided_at`;
    return rows.map((row) => ({
      decisionId: String(row.decision_id), reviewId: String(row.review_id),
      decision: row.decision as ReviewDecision["decision"], decidedAt: iso(row.decided_at),
      decidedBy: String(row.decided_by), notes: row.notes ? String(row.notes) : null
    }));
  }
  async listDocumentSelections(missionId?: string): Promise<DocumentSelection[]> {
    const rows = missionId
      ? await this.sql`select * from openfield.document_selections where mission_id = ${missionId} order by selected_at`
      : await this.sql`select * from openfield.document_selections order by selected_at`;
    return rows.map((row) => ({
      selectionId: String(row.selection_id), missionId: String(row.mission_id),
      watchId: String(row.watch_id), cik: String(row.cik), accessionNumber: String(row.accession_number),
      primaryDocument: String(row.primary_document), form: String(row.form), filedAt: iso(row.filed_at),
      reason: String(row.reason), selectedAt: iso(row.selected_at), selectedBy: String(row.selected_by)
    }));
  }
}
