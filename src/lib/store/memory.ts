import type {
  EvidenceArtifact,
  EvidenceRecord,
  SignedReceipt,
  SourceHealthSample,
  SourceRegistration,
  TemporalQuery
} from "@/domain/evidence";
import { canonicalJson } from "@/lib/canonical-json";
import type { EvidenceStore } from "@/lib/store/types";

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

export class MemoryEvidenceStore implements EvidenceStore {
  readonly mode = "memory" as const;
  private readonly sources = new Map<string, SourceRegistration>();
  private readonly artifacts = new Map<string, EvidenceArtifact>();
  private readonly receipts = new Map<string, SignedReceipt>();
  private readonly records = new Map<string, EvidenceRecord>();
  private readonly health = new Map<string, SourceHealthSample>();

  async appendSource(source: SourceRegistration): Promise<void> {
    appendImmutable(this.sources, `${source.sourceId}@${source.version}`, source, "source registration");
  }

  async appendArtifact(artifact: EvidenceArtifact): Promise<void> {
    appendImmutable(this.artifacts, artifact.artifactHash, artifact, "artifact");
  }

  async appendReceipt(receipt: SignedReceipt): Promise<void> {
    appendImmutable(this.receipts, receipt.payload.receiptId, receipt, "receipt");
  }

  async appendRecord(record: EvidenceRecord): Promise<void> {
    appendImmutable(this.records, record.recordId, record, "record");
  }

  async appendSourceHealth(sample: SourceHealthSample): Promise<void> {
    appendImmutable(this.health, sample.healthId, sample, "source health sample");
  }

  async getReceipt(receiptId: string): Promise<SignedReceipt | null> {
    const receipt = this.receipts.get(receiptId);
    return receipt ? structuredClone(receipt) : null;
  }

  async listSources(): Promise<SourceRegistration[]> {
    const latest = new Map<string, SourceRegistration>();
    for (const source of this.sources.values()) {
      const existing = latest.get(source.sourceId);
      if (!existing || source.version > existing.version) latest.set(source.sourceId, source);
    }
    return [...latest.values()].map((source) => structuredClone(source));
  }

  async getLatestSourceHealth(sourceId: string): Promise<SourceHealthSample | null> {
    const samples = [...this.health.values()]
      .filter((sample) => sample.sourceId === sourceId)
      .sort((a, b) => b.checkedAt.localeCompare(a.checkedAt));
    return samples[0] ? structuredClone(samples[0]) : null;
  }

  async listRecords(query: TemporalQuery = {}): Promise<EvidenceRecord[]> {
    const knownAt = query.knownAt ? new Date(query.knownAt).getTime() : Number.POSITIVE_INFINITY;
    const validAt = query.validAt ? new Date(query.validAt).getTime() : null;

    const candidates = [...this.records.values()]
      .filter((record) => !query.missionId || record.missionId === query.missionId)
      .filter((record) => !query.kind || record.kind === query.kind)
      .filter((record) => new Date(record.recordedAt).getTime() <= knownAt)
      .filter((record) => {
        if (validAt === null) return true;
        const starts = new Date(record.validFrom).getTime() <= validAt;
        const ends = record.validTo === null || new Date(record.validTo).getTime() > validAt;
        return starts && ends;
      })
      .sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));

    const latestByKey = new Map<string, EvidenceRecord>();
    for (const record of candidates) latestByKey.set(record.recordKey, record);
    return [...latestByKey.values()]
      .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))
      .map((record) => structuredClone(record));
  }
}
