import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import type { EvidenceRecord } from "@/domain/evidence";
import { PostgresMissionStore } from "@/lib/mission-store/postgres";
import { PostgresEvidenceStore } from "@/lib/store/postgres";
import { createCompanyWatch, createDocumentSelection } from "@/lib/watchlist";
import { proposeRecordEntityLink } from "@/services/propose-entity-link";

const databaseUrl = process.env.DATABASE_URL;

describe("PostgreSQL mission operations round trip", () => {
  const run = databaseUrl ? it : it.skip;
  run("persists watchlists, analyst-gated links, reviews, decisions, and selections", async () => {
    const store = new PostgresMissionStore(databaseUrl as string);
    const evidence = new PostgresEvidenceStore(databaseUrl as string);
    const suffix = randomUUID();
    const missionId = `data-center-watch:${suffix}`;
    const watch = createCompanyWatch({
      watchId: `watch:${suffix}`, missionId, label: "Integration Compute", cik: "1234",
      createdAt: "2026-07-30T23:50:00.000Z", createdBy: "github-actions"
    });
    const record: EvidenceRecord = {
      recordId: `record:${suffix}`, recordKey: `record:${suffix}`, missionId,
      kind: "observation", title: "Integration filing metadata", summary: "Direct metadata.",
      location: null, validFrom: "2026-07-29T00:00:00.000Z", validTo: null,
      recordedAt: "2026-07-30T23:50:00.000Z", supersedesRecordId: null,
      receiptIds: [], dependencyRecordIds: [],
      confidence: { sourceReliability: .9, directness: .9, corroboration: .2, independence: .8,
        freshness: .9, contradictionPenalty: .02, uncertainty: .1 }, synthetic: true
    };
    try {
      await evidence.appendRecord(record);
      await store.appendWatchlistEntry(watch);
      await store.appendMissionEntity({
        entityId: `entity:${suffix}`, missionId, entityType: "company", canonicalName: watch.label,
        identifiers: { cik: watch.cik as string }, location: null,
        createdAt: "2026-07-30T23:50:00.000Z", createdBy: "github-actions"
      });
      const linkId = `link:${suffix}`;
      const reviewId = `review:${suffix}`;
      await proposeRecordEntityLink(store, {
        link: {
          linkId, missionId, recordId: record.recordId, entityId: `entity:${suffix}`,
          relation: "filed-by", rationale: "CIK equality",
          proposedAt: "2026-07-30T23:51:00.000Z", proposedBy: "resolver"
        },
        review: {
          reviewId, missionId, reviewType: "record-entity-link", subjectId: linkId,
          evidenceRecordIds: [record.recordId], rationale: "Confirm exact identifier",
          createdAt: "2026-07-30T23:51:00.000Z", createdBy: "resolver"
        }
      });
      await store.appendReviewDecision({
        decisionId: `decision:${suffix}`, reviewId, decision: "accept",
        decidedAt: "2026-07-30T23:52:00.000Z", decidedBy: "github-actions", notes: null
      });
      await store.appendDocumentSelection(createDocumentSelection({
        selectionId: `selection:${suffix}`, missionId, watchId: watch.watchId, cik: watch.cik as string,
        accessionNumber: "0000001234-26-000001", primaryDocument: "example8k.htm", form: "8-K",
        filedAt: "2026-07-29T00:00:00.000Z", reason: "integration",
        selectedAt: "2026-07-30T23:53:00.000Z", selectedBy: "github-actions"
      }));
      expect(await store.listWatchlist(missionId)).toHaveLength(1);
      expect(await store.listMissionEntities(missionId)).toHaveLength(1);
      expect(await store.listRecordEntityLinks(missionId)).toHaveLength(1);
      expect(await store.listReviewItems(missionId)).toHaveLength(1);
      expect(await store.listReviewDecisions(reviewId)).toHaveLength(1);
      expect(await store.listDocumentSelections(missionId)).toHaveLength(1);
    } finally {
      await store.close();
      await evidence.close();
    }
  });
});
