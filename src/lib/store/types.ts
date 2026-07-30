import type {
  EvidenceArtifact,
  EvidenceRecord,
  SignedReceipt,
  SourceHealthSample,
  SourceRegistration,
  TemporalQuery
} from "@/domain/evidence";
import type {
  ConnectorExecutionQuery,
  PrivacyDirective,
  PrivacyTargetType,
  SignedConnectorExecution,
  SigningKeyRegistration
} from "@/domain/trust";

export interface EvidenceStore {
  readonly mode: "memory" | "postgres";
  appendSource(source: SourceRegistration): Promise<void>;
  appendArtifact(artifact: EvidenceArtifact): Promise<void>;
  appendReceipt(receipt: SignedReceipt): Promise<void>;
  appendRecord(record: EvidenceRecord): Promise<void>;
  appendSourceHealth(sample: SourceHealthSample): Promise<void>;
  appendSigningKey(registration: SigningKeyRegistration): Promise<void>;
  appendPrivacyDirective(directive: PrivacyDirective): Promise<void>;
  appendConnectorExecution(execution: SignedConnectorExecution): Promise<void>;
  getArtifact(artifactHash: string): Promise<EvidenceArtifact | null>;
  getReceipt(receiptId: string): Promise<SignedReceipt | null>;
  listSources(): Promise<SourceRegistration[]>;
  getLatestSourceHealth(sourceId: string): Promise<SourceHealthSample | null>;
  listRecords(query?: TemporalQuery): Promise<EvidenceRecord[]>;
  listSigningKeyHistory(keyId?: string): Promise<SigningKeyRegistration[]>;
  listPrivacyDirectives(targetType?: PrivacyTargetType, targetId?: string): Promise<PrivacyDirective[]>;
  listConnectorExecutions(query?: ConnectorExecutionQuery): Promise<SignedConnectorExecution[]>;
}
