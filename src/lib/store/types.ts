import type {
  EvidenceArtifact,
  EvidenceRecord,
  SignedReceipt,
  SourceHealthSample,
  SourceRegistration,
  TemporalQuery
} from "@/domain/evidence";

export interface EvidenceStore {
  readonly mode: "memory" | "postgres";
  appendSource(source: SourceRegistration): Promise<void>;
  appendArtifact(artifact: EvidenceArtifact): Promise<void>;
  appendReceipt(receipt: SignedReceipt): Promise<void>;
  appendRecord(record: EvidenceRecord): Promise<void>;
  appendSourceHealth(sample: SourceHealthSample): Promise<void>;
  getReceipt(receiptId: string): Promise<SignedReceipt | null>;
  listSources(): Promise<SourceRegistration[]>;
  getLatestSourceHealth(sourceId: string): Promise<SourceHealthSample | null>;
  listRecords(query?: TemporalQuery): Promise<EvidenceRecord[]>;
}
