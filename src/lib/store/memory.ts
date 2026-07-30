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
  private readonly signingKeys = new Map<string, SigningKeyRegistration>();
  private readonly privacy = new Map<string, PrivacyDirective>();
  private readonly executions = new Map<string, SignedConnectorExecution>();

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
  async appendSigningKey(registration: SigningKeyRegistration): Promise<void> {
    appendImmutable(this.signingKeys, `${registration.keyId}@${registration.version}`, registration, "signing key");
  }
  async appendPrivacyDirective(directive: PrivacyDirective): Promise<void> {
    appendImmutable(this.privacy, directive.directiveId, directive, "privacy directive");
  }
  async appendConnectorExecution(execution: SignedConnectorExecution): Promise<void> {
    appendImmutable(this.executions, execution.payload.executionId, execution, "connector execution");
  }

  async getArtifact(artifactHash: string): Promise<EvidenceArtifact | null> {
    const artifact = this.artifacts.get(artifactHash);
    return artifact ? structuredClone(artifact) : null;
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
    const knownAt = query.knownAt ? Date.parse(query.knownAt) : Number.POSITIVE_INFINITY;
    const validAt = query.validAt ? Date.parse(query.validAt) : null;
    const candidates = [...this.records.values()]
      .filter((record) => !query.missionId || record.missionId === query.missionId)
      .filter((record) => !query.kind || record.kind === query.kind)
      .filter((record) => Date.parse(record.recordedAt) <= knownAt)
      .filter((record) => {
        if (validAt === null) return true;
        return Date.parse(record.validFrom) <= validAt &&
          (record.validTo === null || Date.parse(record.validTo) > validAt);
      })
      .sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
    const latestByKey = new Map<string, EvidenceRecord>();
    for (const record of candidates) latestByKey.set(record.recordKey, record);
    return [...latestByKey.values()]
      .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))
      .map((record) => structuredClone(record));
  }
  async listSigningKeyHistory(keyId?: string): Promise<SigningKeyRegistration[]> {
    return [...this.signingKeys.values()]
      .filter((entry) => !keyId || entry.keyId === keyId)
      .sort((a, b) => a.keyId.localeCompare(b.keyId) || a.version - b.version)
      .map((entry) => structuredClone(entry));
  }
  async listPrivacyDirectives(
    targetType?: PrivacyTargetType,
    targetId?: string
  ): Promise<PrivacyDirective[]> {
    return [...this.privacy.values()]
      .filter((entry) => !targetType || entry.targetType === targetType)
      .filter((entry) => !targetId || entry.targetId === targetId)
      .sort((a, b) => a.effectiveAt.localeCompare(b.effectiveAt))
      .map((entry) => structuredClone(entry));
  }
  async listConnectorExecutions(
    query: ConnectorExecutionQuery = {}
  ): Promise<SignedConnectorExecution[]> {
    const knownAt = query.knownAt ? Date.parse(query.knownAt) : Number.POSITIVE_INFINITY;
    return [...this.executions.values()]
      .filter((entry) => !query.connectorId || entry.payload.connectorId === query.connectorId)
      .filter((entry) => !query.sourceId || entry.payload.sourceId === query.sourceId)
      .filter((entry) => !query.outcome || entry.payload.outcome === query.outcome)
      .filter((entry) => Date.parse(entry.payload.finishedAt) <= knownAt)
      .sort((a, b) => b.payload.finishedAt.localeCompare(a.payload.finishedAt))
      .slice(0, query.limit ?? 100)
      .map((entry) => structuredClone(entry));
  }
}
