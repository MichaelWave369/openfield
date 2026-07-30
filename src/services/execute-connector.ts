import { randomUUID, type KeyObject } from "node:crypto";
import type { OpenFieldConnector } from "@/domain/connectors";
import type {
  ConnectorExecutionOutcome,
  ConnectorExecutionPayload,
  SignedConnectorExecution,
  SigningKeyRegistration
} from "@/domain/trust";
import { canonicalJson } from "@/lib/canonical-json";
import { signConnectorExecution } from "@/lib/execution-receipts";
import { validateSigningKeyHistory } from "@/lib/key-registry";
import { sha256 } from "@/lib/receipts";
import type { EvidenceStore } from "@/lib/store/types";
import { ingestConnectorBatch, type IngestResult } from "@/services/ingest";

export type ExecuteConnectorOptions = {
  store: EvidenceStore;
  nodeId: string;
  signer: { keyId: string; privateKey: KeyObject | string };
  signingKeyHistory: SigningKeyRegistration[];
  now?: () => Date;
  executionId?: () => string;
};

export type ConnectorExecutionResult = {
  ingestion: IngestResult | null;
  execution: SignedConnectorExecution;
};

function errorCode(error: unknown): string {
  if (error instanceof Error && error.name) return error.name;
  return "UnknownConnectorError";
}

function errorDigest(error: unknown): ReturnType<typeof sha256> {
  const safe = error instanceof Error
    ? { name: error.name, message: error.message }
    : { name: "UnknownConnectorError", message: String(error) };
  return sha256(canonicalJson(safe));
}

export async function executeConnector(
  connector: OpenFieldConnector,
  options: ExecuteConnectorOptions
): Promise<ConnectorExecutionResult> {
  const now = options.now ?? (() => new Date());
  const startedAt = now().toISOString();
  const executionId = (options.executionId ?? randomUUID)();
  validateSigningKeyHistory(options.signingKeyHistory);
  const signingKey = [...options.signingKeyHistory].sort((a, b) => a.version - b.version).at(-1);
  if (!signingKey || signingKey.status !== "active") {
    throw new Error("Connector execution requires an active registered signing key");
  }
  if (signingKey.keyId !== options.signer.keyId) {
    throw new Error("Execution signer does not match the registered signing key");
  }
  for (const registration of options.signingKeyHistory) {
    await options.store.appendSigningKey(registration);
  }
  await options.store.appendSource(connector.manifest.source);

  let payload: ConnectorExecutionPayload;
  let ingestion: IngestResult | null = null;
  let executionStored = false;
  try {
    const batch = await connector.collect();
    const telemetry = batch.telemetry ?? {
      requestCount: batch.health.upstreamStatus === null ? 0 : 1,
      upstreamStatuses: batch.health.upstreamStatus === null ? [] : [batch.health.upstreamStatus],
      userAgent: null,
      configurationHash: sha256(canonicalJson({ connector: connector.manifest.connectorId }))
    };
    try {
      ingestion = await ingestConnectorBatch(batch, {
        store: options.store,
        signer: options.signer,
        nodeId: options.nodeId
      });
      const outcome: ConnectorExecutionOutcome =
        batch.health.lastSuccessAt === null ? "upstream-failure" : "succeeded";
      payload = {
        executionVersion: "openfield.connector-execution.v1",
        executionId,
        connectorId: connector.manifest.connectorId,
        connectorVersion: connector.manifest.connectorVersion,
        sourceId: connector.manifest.source.sourceId,
        nodeId: options.nodeId,
        manifestHash: sha256(canonicalJson(connector.manifest)),
        configurationHash: telemetry.configurationHash,
        startedAt,
        finishedAt: now().toISOString(),
        outcome,
        batchId: batch.batchId,
        requestCount: telemetry.requestCount,
        upstreamStatuses: telemetry.upstreamStatuses,
        artifactCount: batch.artifacts.length,
        recordCount: batch.records.length,
        errorCode: outcome === "upstream-failure" ? "UpstreamCollectionFailure" : null,
        errorDigest: null,
        userAgent: telemetry.userAgent
      };
    } catch (error) {
      payload = {
        executionVersion: "openfield.connector-execution.v1",
        executionId,
        connectorId: connector.manifest.connectorId,
        connectorVersion: connector.manifest.connectorVersion,
        sourceId: connector.manifest.source.sourceId,
        nodeId: options.nodeId,
        manifestHash: sha256(canonicalJson(connector.manifest)),
        configurationHash: telemetry.configurationHash,
        startedAt,
        finishedAt: now().toISOString(),
        outcome: "ingestion-rejected",
        batchId: batch.batchId,
        requestCount: telemetry.requestCount,
        upstreamStatuses: telemetry.upstreamStatuses,
        artifactCount: batch.artifacts.length,
        recordCount: batch.records.length,
        errorCode: errorCode(error),
        errorDigest: errorDigest(error),
        userAgent: telemetry.userAgent
      };
      const execution = signConnectorExecution(payload, options.signer.privateKey, options.signer.keyId);
      await options.store.appendConnectorExecution(execution);
      executionStored = true;
      throw error;
    }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Execution signer")) throw error;
    if (executionStored) throw error;
    payload = {
      executionVersion: "openfield.connector-execution.v1",
      executionId,
      connectorId: connector.manifest.connectorId,
      connectorVersion: connector.manifest.connectorVersion,
      sourceId: connector.manifest.source.sourceId,
      nodeId: options.nodeId,
      manifestHash: sha256(canonicalJson(connector.manifest)),
      configurationHash: sha256(canonicalJson({ connector: connector.manifest.connectorId })),
      startedAt,
      finishedAt: now().toISOString(),
      outcome: "connector-error",
      batchId: null,
      requestCount: 0,
      upstreamStatuses: [],
      artifactCount: 0,
      recordCount: 0,
      errorCode: errorCode(error),
      errorDigest: errorDigest(error),
      userAgent: null
    };
    const execution = signConnectorExecution(payload, options.signer.privateKey, options.signer.keyId);
    await options.store.appendConnectorExecution(execution);
    throw error;
  }

  const execution = signConnectorExecution(payload, options.signer.privateKey, options.signer.keyId);
  await options.store.appendConnectorExecution(execution);
  return { ingestion, execution };
}
