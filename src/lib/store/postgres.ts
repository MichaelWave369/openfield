import postgres from "postgres";
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
import type { EvidenceStore } from "@/lib/store/types";

function iso(value: unknown): string {
  return new Date(String(value)).toISOString();
}

function mapRecord(row: Record<string, unknown>): EvidenceRecord {
  const coordinates = row.longitude === null || row.latitude === null
    ? null
    : { type: "Point" as const, coordinates: [Number(row.longitude), Number(row.latitude)] as [number, number] };
  return {
    recordId: String(row.record_id),
    recordKey: String(row.record_key),
    missionId: String(row.mission_id),
    kind: row.kind as EvidenceRecord["kind"],
    title: String(row.title),
    summary: String(row.summary),
    location: coordinates,
    validFrom: iso(row.valid_from),
    validTo: row.valid_to ? iso(row.valid_to) : null,
    recordedAt: iso(row.recorded_at),
    supersedesRecordId: row.supersedes_record_id ? String(row.supersedes_record_id) : null,
    receiptIds: (row.receipt_ids as string[]) ?? [],
    dependencyRecordIds: (row.dependency_record_ids as string[]) ?? [],
    confidence: row.confidence as EvidenceRecord["confidence"],
    synthetic: Boolean(row.synthetic)
  };
}

export class PostgresEvidenceStore implements EvidenceStore {
  readonly mode = "postgres" as const;
  private readonly sql: ReturnType<typeof postgres>;

  constructor(databaseUrl: string) {
    this.sql = postgres(databaseUrl, { max: 8, idle_timeout: 20 });
  }

  async close(): Promise<void> {
    await this.sql.end();
  }

  async appendSource(source: SourceRegistration): Promise<void> {
    await this.sql`
      insert into openfield.source_registrations (
        source_id, version, display_name, owner_name, description, access_mode,
        expected_refresh_seconds, geographic_coverage, missions, privacy_class,
        license, synthetic, enabled, approved_at
      ) values (
        ${source.sourceId}, ${source.version}, ${source.displayName}, ${source.owner},
        ${source.description}, ${source.accessMode}, ${source.expectedRefreshSeconds},
        ${this.sql.json(source.geographicCoverage)}, ${this.sql.json(source.missions)},
        ${source.privacyClass}, ${this.sql.json(source.license)}, ${source.synthetic},
        ${source.enabled}, ${source.approvedAt}
      ) on conflict (source_id, version) do nothing
    `;
  }

  async appendArtifact(artifact: EvidenceArtifact): Promise<void> {
    const bytes = artifact.contentBase64 ? Buffer.from(artifact.contentBase64, "base64") : null;
    await this.sql`
      insert into openfield.artifacts (
        artifact_hash, media_type, byte_length, collected_at, storage_uri, content
      ) values (
        ${artifact.artifactHash}, ${artifact.mediaType}, ${artifact.byteLength},
        ${artifact.collectedAt}, ${artifact.storageUri}, ${bytes}
      ) on conflict (artifact_hash) do nothing
    `;
  }

  async appendReceipt(receipt: SignedReceipt): Promise<void> {
    await this.sql`
      insert into openfield.receipts (
        receipt_id, artifact_hash, payload_hash, payload, signature_algorithm,
        signature_key_id, signature_value_base64, recorded_at
      ) values (
        ${receipt.payload.receiptId}, ${receipt.payload.artifactHash}, ${receipt.payloadHash},
        ${this.sql.json(receipt.payload)}, ${receipt.signature?.algorithm ?? null},
        ${receipt.signature?.keyId ?? null}, ${receipt.signature?.valueBase64 ?? null},
        ${receipt.payload.recordedAt}
      ) on conflict (receipt_id) do nothing
    `;
  }

  async appendRecord(record: EvidenceRecord): Promise<void> {
    const longitude = record.location?.coordinates[0] ?? null;
    const latitude = record.location?.coordinates[1] ?? null;
    await this.sql`
      insert into openfield.records (
        record_id, record_key, mission_id, kind, title, summary, location,
        valid_from, valid_to, recorded_at, supersedes_record_id, receipt_ids,
        dependency_record_ids, confidence, synthetic
      ) values (
        ${record.recordId}, ${record.recordKey}, ${record.missionId}, ${record.kind},
        ${record.title}, ${record.summary},
        case when ${longitude}::double precision is null then null
          else ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326) end,
        ${record.validFrom}, ${record.validTo}, ${record.recordedAt},
        ${record.supersedesRecordId}, ${record.receiptIds}, ${record.dependencyRecordIds},
        ${this.sql.json(record.confidence)}, ${record.synthetic}
      ) on conflict (record_id) do nothing
    `;
  }

  async appendSourceHealth(sample: SourceHealthSample): Promise<void> {
    await this.sql`
      insert into openfield.source_health (
        health_id, source_id, checked_at, last_attempt_at, last_success_at,
        consecutive_failures, latency_ms, records_observed, upstream_status, message
      ) values (
        ${sample.healthId}, ${sample.sourceId}, ${sample.checkedAt}, ${sample.lastAttemptAt},
        ${sample.lastSuccessAt}, ${sample.consecutiveFailures}, ${sample.latencyMs},
        ${sample.recordsObserved}, ${sample.upstreamStatus}, ${sample.message ?? null}
      ) on conflict (health_id) do nothing
    `;
  }

  async appendSigningKey(registration: SigningKeyRegistration): Promise<void> {
    await this.sql`
      insert into openfield.signing_key_registrations (
        key_id, version, algorithm, public_key_base64, status, valid_from, valid_to,
        recorded_at, invalidates_signatures_from, reason, supersedes_version
      ) values (
        ${registration.keyId}, ${registration.version}, ${registration.algorithm},
        ${registration.publicKeyBase64}, ${registration.status}, ${registration.validFrom},
        ${registration.validTo}, ${registration.recordedAt},
        ${registration.invalidatesSignaturesFrom}, ${registration.reason},
        ${registration.supersedesVersion}
      ) on conflict (key_id, version) do nothing
    `;
  }

  async appendPrivacyDirective(directive: PrivacyDirective): Promise<void> {
    await this.sql`
      insert into openfield.privacy_directives (
        directive_id, target_type, target_id, action, reason_code, rationale,
        requested_at, approved_at, approved_by, effective_at, supersedes_directive_id
      ) values (
        ${directive.directiveId}, ${directive.targetType}, ${directive.targetId},
        ${directive.action}, ${directive.reasonCode}, ${directive.rationale},
        ${directive.requestedAt}, ${directive.approvedAt}, ${directive.approvedBy},
        ${directive.effectiveAt}, ${directive.supersedesDirectiveId}
      ) on conflict (directive_id) do nothing
    `;
  }

  async appendConnectorExecution(execution: SignedConnectorExecution): Promise<void> {
    await this.sql`
      insert into openfield.connector_executions (
        execution_id, connector_id, source_id, outcome, started_at, finished_at,
        payload_hash, payload, signature_algorithm, signature_key_id, signature_value_base64
      ) values (
        ${execution.payload.executionId}, ${execution.payload.connectorId},
        ${execution.payload.sourceId}, ${execution.payload.outcome},
        ${execution.payload.startedAt}, ${execution.payload.finishedAt},
        ${execution.payloadHash}, ${this.sql.json(execution.payload)},
        ${execution.signature.algorithm}, ${execution.signature.keyId},
        ${execution.signature.valueBase64}
      ) on conflict (execution_id) do nothing
    `;
  }

  async getArtifact(artifactHash: string): Promise<EvidenceArtifact | null> {
    const rows = await this.sql`
      select artifact_hash, media_type, byte_length, collected_at, storage_uri, content
      from openfield.artifacts where artifact_hash = ${artifactHash} limit 1
    `;
    const row = rows[0];
    if (!row) return null;
    return {
      artifactHash: String(row.artifact_hash) as EvidenceArtifact["artifactHash"],
      mediaType: String(row.media_type),
      byteLength: Number(row.byte_length),
      collectedAt: iso(row.collected_at),
      storageUri: row.storage_uri ? String(row.storage_uri) : null,
      contentBase64: row.content ? Buffer.from(row.content as Uint8Array).toString("base64") : undefined
    };
  }

  async getReceipt(receiptId: string): Promise<SignedReceipt | null> {
    const rows = await this.sql`
      select payload, payload_hash, signature_algorithm, signature_key_id, signature_value_base64
      from openfield.receipts where receipt_id = ${receiptId} limit 1
    `;
    const row = rows[0];
    if (!row) return null;
    return {
      payload: row.payload as SignedReceipt["payload"],
      payloadHash: row.payload_hash as SignedReceipt["payloadHash"],
      signature: row.signature_algorithm ? {
        algorithm: "Ed25519",
        keyId: String(row.signature_key_id),
        valueBase64: String(row.signature_value_base64)
      } : null
    };
  }

  async listSources(): Promise<SourceRegistration[]> {
    const rows = await this.sql`
      select distinct on (source_id) * from openfield.source_registrations
      order by source_id, version desc
    `;
    return rows.map((row) => ({
      sourceId: String(row.source_id),
      version: Number(row.version),
      displayName: String(row.display_name),
      owner: String(row.owner_name),
      description: String(row.description),
      accessMode: row.access_mode as SourceRegistration["accessMode"],
      expectedRefreshSeconds: Number(row.expected_refresh_seconds),
      geographicCoverage: row.geographic_coverage as string[],
      missions: row.missions as string[],
      privacyClass: row.privacy_class as SourceRegistration["privacyClass"],
      license: row.license as SourceRegistration["license"],
      synthetic: Boolean(row.synthetic),
      enabled: Boolean(row.enabled),
      approvedAt: iso(row.approved_at)
    }));
  }

  async getLatestSourceHealth(sourceId: string): Promise<SourceHealthSample | null> {
    const rows = await this.sql`
      select * from openfield.source_health
      where source_id = ${sourceId}
      order by checked_at desc limit 1
    `;
    const row = rows[0];
    if (!row) return null;
    return {
      healthId: String(row.health_id),
      sourceId: String(row.source_id),
      checkedAt: iso(row.checked_at),
      lastAttemptAt: iso(row.last_attempt_at),
      lastSuccessAt: row.last_success_at ? iso(row.last_success_at) : null,
      consecutiveFailures: Number(row.consecutive_failures),
      latencyMs: row.latency_ms === null ? null : Number(row.latency_ms),
      recordsObserved: Number(row.records_observed),
      upstreamStatus: row.upstream_status === null ? null : Number(row.upstream_status),
      message: row.message ? String(row.message) : undefined
    };
  }

  async listRecords(query: TemporalQuery = {}): Promise<EvidenceRecord[]> {
    const clauses = ["recorded_at <= $1::timestamptz"];
    const params: string[] = [query.knownAt ?? new Date().toISOString()];
    if (query.validAt) {
      params.push(query.validAt);
      clauses.push(`valid_from <= $${params.length}::timestamptz and (valid_to is null or valid_to > $${params.length}::timestamptz)`);
    }
    if (query.missionId) {
      params.push(query.missionId);
      clauses.push(`mission_id = $${params.length}`);
    }
    if (query.kind) {
      params.push(query.kind);
      clauses.push(`kind = $${params.length}`);
    }
    const rows = await this.sql.unsafe(`
      select distinct on (record_key)
        *, ST_X(location) as longitude, ST_Y(location) as latitude
      from openfield.records
      where ${clauses.join(" and ")}
      order by record_key, recorded_at desc
    `, params);
    return rows.map((row) => mapRecord(row as Record<string, unknown>));
  }

  async listSigningKeyHistory(keyId?: string): Promise<SigningKeyRegistration[]> {
    const rows = keyId
      ? await this.sql`select * from openfield.signing_key_registrations where key_id = ${keyId} order by version`
      : await this.sql`select * from openfield.signing_key_registrations order by key_id, version`;
    return rows.map((row) => ({
      keyId: String(row.key_id),
      version: Number(row.version),
      algorithm: "Ed25519",
      publicKeyBase64: String(row.public_key_base64),
      status: row.status as SigningKeyRegistration["status"],
      validFrom: iso(row.valid_from),
      validTo: row.valid_to ? iso(row.valid_to) : null,
      recordedAt: iso(row.recorded_at),
      invalidatesSignaturesFrom: row.invalidates_signatures_from ? iso(row.invalidates_signatures_from) : null,
      reason: row.reason ? String(row.reason) : null,
      supersedesVersion: row.supersedes_version === null ? null : Number(row.supersedes_version)
    }));
  }

  async listPrivacyDirectives(
    targetType?: PrivacyTargetType,
    targetId?: string
  ): Promise<PrivacyDirective[]> {
    const rows = await this.sql`select * from openfield.privacy_directives order by effective_at, approved_at`;
    return rows
      .filter((row) => !targetType || row.target_type === targetType)
      .filter((row) => !targetId || row.target_id === targetId)
      .map((row) => ({
        directiveId: String(row.directive_id),
        targetType: row.target_type as PrivacyDirective["targetType"],
        targetId: String(row.target_id),
        action: row.action as PrivacyDirective["action"],
        reasonCode: row.reason_code as PrivacyDirective["reasonCode"],
        rationale: String(row.rationale),
        requestedAt: iso(row.requested_at),
        approvedAt: iso(row.approved_at),
        approvedBy: String(row.approved_by),
        effectiveAt: iso(row.effective_at),
        supersedesDirectiveId: row.supersedes_directive_id ? String(row.supersedes_directive_id) : null
      }));
  }

  async listConnectorExecutions(
    query: ConnectorExecutionQuery = {}
  ): Promise<SignedConnectorExecution[]> {
    const rows = await this.sql`
      select payload, payload_hash, signature_algorithm, signature_key_id, signature_value_base64
      from openfield.connector_executions order by finished_at desc limit ${query.limit ?? 100}
    `;
    const knownAt = query.knownAt ? Date.parse(query.knownAt) : Number.POSITIVE_INFINITY;
    return rows
      .map((row) => ({
        payload: row.payload as SignedConnectorExecution["payload"],
        payloadHash: row.payload_hash as SignedConnectorExecution["payloadHash"],
        signature: {
          algorithm: "Ed25519" as const,
          keyId: String(row.signature_key_id),
          valueBase64: String(row.signature_value_base64)
        }
      }))
      .filter((entry) => !query.connectorId || entry.payload.connectorId === query.connectorId)
      .filter((entry) => !query.sourceId || entry.payload.sourceId === query.sourceId)
      .filter((entry) => !query.outcome || entry.payload.outcome === query.outcome)
      .filter((entry) => Date.parse(entry.payload.finishedAt) <= knownAt);
  }
}
