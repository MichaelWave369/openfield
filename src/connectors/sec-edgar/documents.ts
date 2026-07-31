import { randomUUID } from "node:crypto";
import type { ConnectorBatch, ConnectorManifest, OpenFieldConnector } from "@/domain/connectors";
import type { DocumentSelection } from "@/domain/mission";
import type { SourceRegistration } from "@/domain/evidence";
import { canonicalJson } from "@/lib/canonical-json";
import { sha256 } from "@/lib/receipts";
import { secArchiveDocumentUrl } from "@/lib/watchlist";

type FetchResponse = Pick<Response, "ok" | "status" | "arrayBuffer" | "headers">;
type FetchLike = (input: string | URL, init?: RequestInit) => Promise<FetchResponse>;
type Sleep = (milliseconds: number) => Promise<void>;

export type SecEdgarDocumentConnectorOptions = {
  selection: DocumentSelection;
  userAgent: string;
  fetchFn?: FetchLike;
  now?: () => Date;
  sleep?: Sleep;
  minimumIntervalMs?: number;
  maxDocumentBytes?: number;
  approvedAt?: string;
};

let documentQueue: Promise<void> = Promise.resolve();
let nextDocumentRequestAt = 0;

function validateUserAgent(value: string): string {
  const normalized = value.trim();
  if (normalized.length < 8 || !normalized.includes("@")) {
    throw new Error("SEC User-Agent must identify the application and an administrative contact email");
  }
  return normalized;
}

async function scheduledRequest<T>(
  minimumIntervalMs: number,
  sleep: Sleep,
  operation: () => Promise<T>
): Promise<T> {
  let resolveResult!: (value: T | PromiseLike<T>) => void;
  let rejectResult!: (reason?: unknown) => void;
  const result = new Promise<T>((resolve, reject) => {
    resolveResult = resolve;
    rejectResult = reject;
  });
  documentQueue = documentQueue.then(async () => {
    try {
      const wait = Math.max(0, nextDocumentRequestAt - Date.now());
      if (wait > 0) await sleep(wait);
      nextDocumentRequestAt = Date.now() + minimumIntervalMs;
      resolveResult(await operation());
    } catch (error) {
      rejectResult(error);
    }
  });
  await documentQueue;
  return result;
}

export class SecEdgarDocumentConnector implements OpenFieldConnector {
  readonly manifest: ConnectorManifest;
  private readonly selection: DocumentSelection;
  private readonly userAgent: string;
  private readonly fetchFn: FetchLike;
  private readonly now: () => Date;
  private readonly sleep: Sleep;
  private readonly minimumIntervalMs: number;
  private readonly maxDocumentBytes: number;

  constructor(options: SecEdgarDocumentConnectorOptions) {
    this.selection = options.selection;
    this.userAgent = validateUserAgent(options.userAgent);
    this.fetchFn = options.fetchFn ?? fetch;
    this.now = options.now ?? (() => new Date());
    this.sleep = options.sleep ?? ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
    this.minimumIntervalMs = Math.max(125, options.minimumIntervalMs ?? 125);
    this.maxDocumentBytes = Math.min(100_000_000, Math.max(1_024, options.maxDocumentBytes ?? 20_000_000));
    const source: SourceRegistration = {
      sourceId: `sec.edgar.archive.cik.${this.selection.cik}`,
      version: 1,
      displayName: `SEC EDGAR filing archive — CIK ${this.selection.cik}`,
      owner: "U.S. Securities and Exchange Commission",
      description: "Operator-selected public filing documents retrieved from the official SEC EDGAR archive.",
      accessMode: "document",
      expectedRefreshSeconds: 86_400,
      geographicCoverage: ["United States"],
      missions: [this.selection.missionId],
      privacyClass: "public",
      license: {
        name: "SEC EDGAR public filing archive; access subject to SEC fair-access policy",
        url: "https://www.sec.gov/search-filings/edgar-search-assistance/accessing-edgar-data",
        attributionRequired: true,
        redistributionAllowed: false
      },
      synthetic: false,
      enabled: true,
      approvedAt: options.approvedAt ?? "2026-07-30T23:40:00.000Z"
    };
    this.manifest = {
      connectorId: "openfield.connector.sec-edgar-document",
      connectorVersion: "0.4.0",
      source,
      collectionMethod: "Operator-selected HTTPS GET of a specific official SEC EDGAR archive document",
      rateLimitDescription: "Serialized requests with a minimum 125 ms interval (maximum 8 requests/second)",
      failureBehavior: "emit-explicit-health-only"
    };
  }

  async collect(): Promise<ConnectorBatch> {
    const collectedAt = this.now().toISOString();
    const started = Date.now();
    const endpoint = secArchiveDocumentUrl(
      this.selection.cik,
      this.selection.accessionNumber,
      this.selection.primaryDocument
    );
    const configurationHash = sha256(canonicalJson({
      selectionId: this.selection.selectionId,
      watchId: this.selection.watchId,
      endpoint,
      maxDocumentBytes: this.maxDocumentBytes
    }));
    const failure = (status: number | null, message: string): ConnectorBatch => ({
      batchId: randomUUID(),
      collectedAt,
      manifest: this.manifest,
      artifacts: [],
      records: [],
      health: {
        healthId: randomUUID(),
        sourceId: this.manifest.source.sourceId,
        checkedAt: collectedAt,
        lastAttemptAt: collectedAt,
        lastSuccessAt: null,
        consecutiveFailures: 1,
        latencyMs: Date.now() - started,
        recordsObserved: 0,
        upstreamStatus: status,
        message
      },
      telemetry: {
        requestCount: 1,
        upstreamStatuses: status === null ? [] : [status],
        userAgent: this.userAgent,
        configurationHash
      }
    });

    let response: FetchResponse;
    try {
      response = await scheduledRequest(this.minimumIntervalMs, this.sleep, () =>
        this.fetchFn(endpoint, {
          method: "GET",
          headers: {
            "User-Agent": this.userAgent,
            "Accept": "text/html, text/plain, application/xml, application/xhtml+xml, */*",
            "Accept-Encoding": "gzip, deflate"
          },
          cache: "no-store"
        })
      );
    } catch {
      return failure(null, "SEC filing document request failed before an HTTP response was received.");
    }
    if (!response.ok) {
      return failure(response.status, `SEC filing archive returned HTTP ${response.status}; no stale document was replayed.`);
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength === 0) {
      return failure(response.status, "SEC filing archive returned an empty document; no observation was emitted.");
    }
    if (bytes.byteLength > this.maxDocumentBytes) {
      return failure(response.status, `SEC filing document exceeded the configured ${this.maxDocumentBytes}-byte admission limit.`);
    }
    const mediaType = response.headers.get("content-type")?.split(";")[0]?.trim() || "application/octet-stream";
    const recordId = `sec-document:${this.selection.cik}:${this.selection.accessionNumber}:${this.selection.primaryDocument}`;
    return {
      batchId: randomUUID(),
      collectedAt,
      manifest: this.manifest,
      artifacts: [{
        sourceRecordId: `${this.selection.accessionNumber}/${this.selection.primaryDocument}`,
        mediaType,
        bytes,
        collectedAt,
        observedAt: collectedAt,
        validFrom: this.selection.filedAt,
        validTo: null,
        transformations: []
      }],
      records: [{
        recordId,
        recordKey: recordId,
        missionId: this.selection.missionId,
        kind: "observation",
        title: `SEC filing document retrieved: ${this.selection.form}`,
        summary: [
          `OpenField retrieved the operator-selected primary document ${this.selection.primaryDocument}`,
          `for accession ${this.selection.accessionNumber} from the official SEC archive.`,
          "This observation establishes document retrieval and custody only; relevance and meaning require separate analyst review."
        ].join(" "),
        location: null,
        validFrom: this.selection.filedAt,
        validTo: null,
        recordedAt: collectedAt,
        supersedesRecordId: null,
        artifactIndex: 0,
        dependencyRecordIds: [],
        confidence: {
          sourceReliability: 0.98,
          directness: 0.99,
          corroboration: 0.2,
          independence: 0.9,
          freshness: 0.95,
          contradictionPenalty: 0.02,
          uncertainty: 0.12
        },
        synthetic: false
      }],
      health: {
        healthId: randomUUID(),
        sourceId: this.manifest.source.sourceId,
        checkedAt: collectedAt,
        lastAttemptAt: collectedAt,
        lastSuccessAt: collectedAt,
        consecutiveFailures: 0,
        latencyMs: Date.now() - started,
        recordsObserved: 1,
        upstreamStatus: response.status,
        message: "Official SEC archive document collected; exact response bytes preserved before analysis."
      },
      telemetry: {
        requestCount: 1,
        upstreamStatuses: [response.status],
        userAgent: this.userAgent,
        configurationHash
      }
    };
  }
}
